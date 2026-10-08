import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { executeGeminiWithRetry, isTransientGeminiError } from './src/server/geminiRetry.ts';
import { normalizeMatchExtractionResponse } from './src/utils/matchingAndScoring.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// High payload limit for receiving multiple high-res screenshot base64 strings
app.use(express.json({ limit: '70mb' }));
app.use(express.urlencoded({ extended: true, limit: '70mb' }));

// Body-parser error handler to guarantee JSON response instead of default HTML
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    res.setHeader('Content-Type', 'application/json');
    console.error(`[API Payload] Request entity too large (HTTP 413) on ${req.method} ${req.path}`);
    return res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'The uploaded screenshot payload is too large. Please upload smaller or fewer screenshots at a time.',
      },
    });
  }
  if (err) {
    res.setHeader('Content-Type', 'application/json');
    console.error(`[API Payload] Body parsing error on ${req.method} ${req.path}: ${err.message || err}`);
    return res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'Invalid request body or JSON syntax error.',
      },
    });
  }
  next(err);
});

// Helper to safely determine numeric HTTP status code without Express RangeErrors
function getSafeHttpStatus(error: any, isTransient: boolean): number {
  if (isTransient) return 503;

  const raw = error?.statusCode ?? error?.status ?? error?.response?.status;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 100 && raw <= 599) {
    return raw;
  }
  if (typeof raw === 'string') {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 100 && parsed <= 599) {
      return parsed;
    }
    const lower = raw.toLowerCase();
    if (lower.includes('unavailable')) return 503;
    if (lower.includes('resource_exhausted')) return 429;
    if (lower.includes('invalid_argument')) return 400;
    if (lower.includes('permission_denied') || lower.includes('unauthenticated')) return 403;
    if (lower.includes('not_found')) return 404;
  }

  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('api_key') || msg.includes('api key') || msg.includes('permission denied') || msg.includes('unauthenticated')) {
    return 403;
  }
  if (msg.includes('invalid argument') || msg.includes('bad request')) {
    return 400;
  }
  if (msg.includes('quota') || msg.includes('rate limit')) {
    return 429;
  }
  if (msg.includes('unavailable') || msg.includes('high demand') || msg.includes('overloaded') || msg.includes('503')) {
    return 503;
  }

  return 500;
}

// Helper to safely parse JSON from Gemini text output, stripping markdown code blocks
function parseGeminiJson<T>(rawText: string | undefined): T {
  if (!rawText || !rawText.trim()) {
    throw new Error('Gemini returned an empty text response.');
  }

  let text = rawText.trim();

  // 1. Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    text = fenceMatch[1].trim();
  } else if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // 2. Extract valid JSON between outermost { or [ and } or ]
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx !== -1) {
    const isObject = text[startIdx] === '{';
    const lastChar = isObject ? '}' : ']';
    const lastIdx = text.lastIndexOf(lastChar);
    if (lastIdx !== -1 && lastIdx > startIdx) {
      text = text.slice(startIdx, lastIdx + 1).trim();
    }
  }

  // 3. First attempt: standard JSON.parse
  try {
    return JSON.parse(text);
  } catch (initialErr) {
    // 4. Second attempt: strip trailing commas before closing braces/brackets
    try {
      const sanitized = text.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(sanitized);
    } catch {
      // Re-throw initial error
      throw initialErr;
    }
  }
}

// Helper to get fresh GoogleGenAI instance with current server GEMINI_API_KEY
function getGoogleGenAI(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API endpoint: /api/extract-slots
app.post('/api/extract-slots', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { images, teamCount, playersPerTeam } = req.body || {};

    if (!images || !Array.isArray(images) || images.length === 0) {
      console.warn('[API /api/extract-slots] Bad request: No images provided | HTTP 400');
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'At least one screenshot image is required.',
        },
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('[API /api/extract-slots] Server error: GEMINI_API_KEY is not configured | HTTP 500');
      return res.status(500).json({
        error: {
          code: 'CONFIG_ERROR',
          message: 'GEMINI_API_KEY is not configured on the server. Please check the Secrets panel.',
        },
      });
    }

    console.log(
      `[API /api/extract-slots] Received extraction request with ${images.length} screenshot(s) (teams: ${teamCount || 12}, squad: ${playersPerTeam || 4})`
    );

    // Prepare image parts for Gemini
    const imageParts = images.map((img: { data: string; mimeType: string }) => ({
      inlineData: {
        data: img.data,
        mimeType: img.mimeType || 'image/png',
      },
    }));

    const extractionPrompt = `You are an expert esports tournament data extractor specializing in Free Fire Battle Royale custom room and lobby screenshots.

Extract the structured slot list and player rosters from the provided screenshots.
Expected context:
- Tournament configured teams: ${teamCount || 12}
- Expected players per squad: ${playersPerTeam || 4}

CRITICAL RULES:
1. Read every visible slot carefully. Free Fire custom rooms show slots numbered (e.g. 1, 2, 3, 4, ...).
2. For each slot identify:
   - slotNumber: (Integer, e.g. 1, 2, 3...)
   - teamName: (Optional string if a distinct team name or clan tag is shown, otherwise leave as empty string "")
   - players: Array of player names visible in that slot.
3. PRESERVE PLAYER NAMES EXACTLY:
   - Free Fire player names frequently contain spaces, dots, underscores, numbers, special characters, symbols, and decorative Unicode (e.g. "J A Y 16", "XE LEVI.07", "SUNGOD9IKA", "DON.18", "NennaBhai_Yt", "T.N.Reddy", "亗 ᴋɪʟʟᴇʀ 亗").
   - DO NOT sanitize names into simple alphanumeric strings.
   - DO NOT remove spaces, dots, underscores, hyphens, or symbols.
   - DO NOT correct spelling, normalize, or invent names.
   - If a name is blurry or ambiguous, return the best visible reading and mark confidence as "low". If clear, mark confidence as "high".
4. MULTIPLE SCREENSHOTS MERGING:
   - The provided screenshots may show a scrolling lobby (e.g., Image 1 shows Slots 1–10, Image 2 shows Slots 11–12).
   - If the same slot appears across multiple screenshots, MERGE the players for that slot, deduplicating identical player names.
   - Sort slots in ascending numerical order by slotNumber (1, 2, 3...).
   - Only include slots that are actually visible in the screenshots. Do NOT invent missing slots.

Return ONLY structured JSON conforming to the requested schema.`;

    const textPart = { text: extractionPrompt };
    const aiClient = getGoogleGenAI();

    const response = await executeGeminiWithRetry({
      ai: aiClient,
      primaryModel: 'gemini-3.8-flash',
      fallbackModel: 'gemini-3.1-flash-lite',
      contents: { parts: [...imageParts, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            slots: {
              type: Type.ARRAY,
              description: 'List of detected slots in the Free Fire lobby screenshots',
              items: {
                type: Type.OBJECT,
                properties: {
                  slotNumber: {
                    type: Type.INTEGER,
                    description: 'The lobby slot number (1, 2, ...)',
                  },
                  teamName: {
                    type: Type.STRING,
                    description: 'Team name or clan tag if visible, or empty string',
                  },
                  players: {
                    type: Type.ARRAY,
                    description: 'Players in this slot',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: {
                          type: Type.STRING,
                          description: 'Verbatim player name including spaces and symbols',
                        },
                        confidence: {
                          type: Type.STRING,
                          description: 'Detection confidence: high, medium, or low',
                        },
                      },
                      required: ['name'],
                    },
                  },
                },
                required: ['slotNumber', 'players'],
              },
            },
          },
          required: ['slots'],
        },
      },
      endpointName: '/api/extract-slots',
    });

    const responseText = response.text;
    if (!responseText || !responseText.trim()) {
      console.error('[API /api/extract-slots] Gemini returned empty response text | HTTP 502');
      return res.status(502).json({
        error: {
          code: 'INVALID_RESPONSE',
          message: 'Vision model returned an empty response. Please try again.',
        },
      });
    }

    let parsedData: any;
    try {
      parsedData = parseGeminiJson(responseText);
    } catch (parseError: any) {
      console.error(`[API /api/extract-slots] Response parsing failure: ${parseError.message} | HTTP 502`);
      return res.status(502).json({
        error: {
          code: 'INVALID_RESPONSE',
          message: 'Vision model returned an invalid response format. Please try again.',
        },
      });
    }

    const rawSlots = Array.isArray(parsedData)
      ? parsedData
      : Array.isArray(parsedData?.slots)
      ? parsedData.slots
      : [];

    const usedModel = (response as any).modelUsed || 'gemini-3.8-flash';
    console.log(`[API /api/extract-slots] HTTP 200 OK | Successfully extracted ${rawSlots.length} slot(s) | Model: ${usedModel}`);
    return res.status(200).json({ slots: rawSlots });
  } catch (error: any) {
    const isTransient = error.isTransient || isTransientGeminiError(error);
    const httpStatus = getSafeHttpStatus(error, isTransient);
    const rawStatus = error.status || error.statusCode || error.response?.status || (isTransient ? 'UNAVAILABLE' : 'ERROR');
    const errCode = error.code || (isTransient ? 'GEMINI_UNAVAILABLE' : (httpStatus === 401 || httpStatus === 403 ? 'CONFIG_ERROR' : 'EXTRACTION_FAILED'));

    console.error(
      `[API /api/extract-slots] Error (HTTP ${httpStatus}) | Code: ${errCode} | Gemini Status: ${rawStatus} | Message: ${error.message || error}`
    );

    if (isTransient || httpStatus === 503) {
      return res.status(503).json({
        error: {
          code: 'GEMINI_UNAVAILABLE',
          message: 'Gemini Vision is temporarily unavailable. Please try again.',
        },
      });
    }

    if (httpStatus === 401 || httpStatus === 403 || errCode === 'CONFIG_ERROR') {
      return res.status(httpStatus).json({
        error: {
          code: 'CONFIG_ERROR',
          message: 'GEMINI_API_KEY is not configured or invalid on the server. Please check the Secrets panel.',
        },
      });
    }

    if (httpStatus === 400 || errCode === 'INVALID_REQUEST') {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: error.message || 'At least one screenshot image is required.',
        },
      });
    }

    return res.status(httpStatus).json({
      error: {
        code: typeof errCode === 'string' ? errCode : 'EXTRACTION_FAILED',
        message: error.message || 'Extraction failed. Please try again.',
      },
    });
  }
});

// API endpoint: /api/extract-match-results
app.post('/api/extract-match-results', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { images, teamCount, playersPerTeam, savedSlots } = req.body || {};

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'At least one match screenshot image is required.',
          retryable: false,
        },
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: {
          code: 'CONFIG_ERROR',
          message: 'GEMINI_API_KEY is not configured on the server. Please check the Secrets panel.',
          retryable: false,
        },
      });
    }

    // Prepare image parts for Gemini
    const imageParts = images.map((img: { data: string; mimeType: string }) => ({
      inlineData: {
        data: img.data,
        mimeType: img.mimeType || 'image/png',
      },
    }));

    // Build context with saved slot roster if available to help OCR player disambiguation
    let rosterContext = '';
    if (savedSlots && Array.isArray(savedSlots) && savedSlots.length > 0) {
      rosterContext = `\nKnown Tournament Slot Roster for Reference (use this to help disambiguate characters if unclear, but do not hallucinate):\n` +
        savedSlots.map((s: any) => `Slot ${s.slotNumber}: ${s.players.map((p: any) => p.name).join(', ')}`).join('\n');
    }

    const extractionPrompt = `You are an expert esports tournament data extractor specializing in Free Fire Battle Royale match result screenshots.

Extract raw match facts from the provided screenshots into structured JSON.
Expected context:
- Tournament configured teams: ${teamCount || 12}
- Expected players per squad: ${playersPerTeam || 4}
${rosterContext}

CRITICAL RULES:
1. EXTRACT RAW FACTS ONLY:
   - Extract placement rank and individual player kills.
   - Do NOT calculate points (do not include placementPoints, killPoints, or totalPoints).
   - Do NOT invent missing players or kills.
2. DISTINGUISH PLACEMENT vs. PLAYER KILLS vs. TEAM TOTAL KILLS:
   - Free Fire match results display placement/rank (e.g. #1, #2, #3, ...).
   - Free Fire shows each squad member with their individual elimination count next to their name.
   - If individual player kills are visible, extract those exact individual kill integers.
   - If individual kills are obscured or unreadable, set kills to null (do NOT guess or fabricate).
   - Ignore decorative totals, banners, spectator counts, badges, and any aggregate number that is not an individual player's kill count.
3. PRESERVE PLAYER NAMES EXACTLY:
   - Free Fire names frequently include dots, spaces, clan tags, and Unicode symbols (e.g. "GZ.BION-", "SES.JOJONK", "RRQ.Dutzz", "亗 ᴋɪʟʟᴇʀ 亗").
   - Do not sanitize or modify the spelling.
4. MULTIPLE SCREENSHOTS MERGING:
   - If multiple screenshots are provided (e.g. Image 1 shows Placements 1–6, Image 2 shows Placements 7–12):
     Combine them into a single list of results.
   - If the same placement/team appears in multiple screenshots, merge their players and deduplicate identical names.
   - Sort the final results in ascending order by placement (1, 2, 3...).

Return ONLY valid JSON conforming to the schema.`;

    const textPart = { text: extractionPrompt };
    const aiClient = getGoogleGenAI();

    const response = await executeGeminiWithRetry({
      ai: aiClient,
      primaryModel: 'gemini-3.8-flash',
      fallbackModel: 'gemini-3.1-flash-lite',
      contents: { parts: [...imageParts, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.ARRAY,
              description: 'Placements extracted from match result screenshots',
              items: {
                type: Type.OBJECT,
                properties: {
                  placement: {
                    type: Type.INTEGER,
                    description: 'Placement rank integer (1, 2, 3...)',
                  },
                  players: {
                    type: Type.ARRAY,
                    description: 'Squad players and their individual kills in this placement',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        playerName: {
                          type: Type.STRING,
                          description: 'Exact visible player name from screenshot',
                        },
                        kills: {
                          type: Type.INTEGER,
                          nullable: true,
                          description: 'Individual elimination count (0, 1, 2...) or null if unreadable',
                        },
                      },
                      required: ['playerName'],
                    },
                  },
                  teamName: {
                    type: Type.STRING,
                    nullable: true,
                    description: 'Visible squad or clan name if explicitly shown on screenshot, or null',
                  },
                },
                required: ['placement', 'players'],
              },
            },
          },
          required: ['results'],
        },
      },
      endpointName: '/api/extract-match-results',
    });

    const responseText = response.text;
    const responseLen = responseText ? responseText.length : 0;
    const usedModel = (response as any).modelUsed || 'gemini-3.8-flash';

    if (!responseText || !responseText.trim()) {
      console.error(
        `[API /api/extract-match-results] Gemini returned empty response text | Model: ${usedModel} | HTTP 502 | Length: 0`
      );
      return res.status(502).json({
        error: {
          code: 'INVALID_RESPONSE',
          message: 'Vision model returned an invalid match-results response.',
        },
      });
    }

    let parsedData: any = null;
    let jsonParseSuccess = false;
    try {
      parsedData = parseGeminiJson(responseText);
      jsonParseSuccess = true;
    } catch (parseError: any) {
      console.error(
        `[API /api/extract-match-results] Response parsing failure: ${parseError.message} | Model: ${usedModel} | HTTP 502 | Length: ${responseLen} | JSON parsed: false`
      );
      return res.status(502).json({
        error: {
          code: 'INVALID_RESPONSE',
          message: 'Vision model returned an invalid match-results response.',
        },
      });
    }

    const normalizedResults = normalizeMatchExtractionResponse(parsedData);
    if (!normalizedResults || normalizedResults.length === 0) {
      console.error(
        `[API /api/extract-match-results] Normalization failed (0 valid placements found) | Model: ${usedModel} | HTTP 502 | Length: ${responseLen} | JSON parsed: ${jsonParseSuccess} | Normalized result count: 0 | Extracted placement count: 0`
      );
      return res.status(502).json({
        error: {
          code: 'INVALID_RESPONSE',
          message: 'Vision model returned an invalid match-results response.',
        },
      });
    }

    const totalPlacements = normalizedResults.length;
    const extractedPlacementCount = new Set(normalizedResults.map((r: any) => r.placement)).size;
    const totalExtractedPlayers = normalizedResults.reduce((acc: number, r: any) => acc + r.players.length, 0);
    console.log(
      `[API /api/extract-match-results] HTTP 200 OK | Model: ${usedModel} | Length: ${responseLen} | JSON parsed: ${jsonParseSuccess} | Normalized result count: ${totalPlacements} | Extracted placement count: ${extractedPlacementCount} | Players: ${totalExtractedPlayers}`
    );
    return res.status(200).json({ results: normalizedResults });
  } catch (error: any) {
    const isTransient = error.isTransient || isTransientGeminiError(error);
    const httpStatus = getSafeHttpStatus(error, isTransient);
    const rawStatus = error.status || error.statusCode || error.response?.status || (isTransient ? 'UNAVAILABLE' : 'ERROR');
    const errCode = error.code || (isTransient ? 'GEMINI_UNAVAILABLE' : (httpStatus === 401 || httpStatus === 403 ? 'CONFIG_ERROR' : 'EXTRACTION_FAILED'));

    console.error(
      `[API /api/extract-match-results] Error (HTTP ${httpStatus}) | Code: ${errCode} | Gemini Status: ${rawStatus} | Message: ${error.message || error}`
    );

    if (isTransient || httpStatus === 503) {
      return res.status(503).json({
        error: {
          code: 'GEMINI_UNAVAILABLE',
          message: 'Gemini Vision is temporarily unavailable. Please try again.',
        },
      });
    }

    if (httpStatus === 401 || httpStatus === 403 || errCode === 'CONFIG_ERROR') {
      return res.status(httpStatus).json({
        error: {
          code: 'CONFIG_ERROR',
          message: 'GEMINI_API_KEY is not configured or invalid on the server. Please check the Secrets panel.',
        },
      });
    }

    if (httpStatus === 400 || errCode === 'INVALID_REQUEST') {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: error.message || 'At least one match screenshot image is required.',
        },
      });
    }

    return res.status(httpStatus).json({
      error: {
        code: typeof errCode === 'string' ? errCode : 'EXTRACTION_FAILED',
        message: error.message || 'Extraction failed. Please try again.',
      },
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    status: 'ok',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// 404 handler for API routes to prevent falling through to Vite HTML fallback
app.all('/api/*', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `API endpoint ${req.method} ${req.path} not found.`,
      retryable: false,
    },
  });
});

// Global API error handler ensuring JSON responses
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.originalUrl?.startsWith('/api') || req.path?.startsWith('/api')) {
    res.setHeader('Content-Type', 'application/json');
    const isTransient = err?.isTransient || isTransientGeminiError(err);
    const safeStatus = getSafeHttpStatus(err, isTransient);
    console.error(`[API Global Error] ${req.method} ${req.path} | HTTP ${safeStatus} | Message: ${err?.message || err}`);

    if (isTransient || safeStatus === 503) {
      return res.status(503).json({
        error: {
          code: 'GEMINI_UNAVAILABLE',
          message: 'Gemini Vision is temporarily unavailable. Please try again.',
        },
      });
    }
    return res.status(safeStatus).json({
      error: {
        code: err?.code || 'EXTRACTION_FAILED',
        message: err?.message || 'Extraction failed. Please try again.',
      },
    });
  }
  next(err);
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tournament Points server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
