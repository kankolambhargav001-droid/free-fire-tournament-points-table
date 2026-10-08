import { GoogleGenAI } from '@google/genai';

export interface GeminiRetryOptions {
  ai: GoogleGenAI;
  primaryModel?: string;
  fallbackModel?: string;
  contents: any;
  config: any;
  maxPrimaryRetries?: number;
  baseDelayMs?: number;
  endpointName?: string;
}

/**
 * Determines if an error from Gemini is a transient service error (408, 429, 500, 502, 503, 504, UNAVAILABLE, RESOURCE_EXHAUSTED).
 * Explicitly DOES NOT retry permanent client errors (400, 401, 403, 404, INVALID_ARGUMENT, PERMISSION_DENIED, etc.).
 */
export function isTransientGeminiError(error: any): boolean {
  if (!error) return false;

  // Check numeric status code on error object
  const rawStatus = error.status || error.statusCode || error.response?.status;
  if (rawStatus !== undefined && rawStatus !== null) {
    const numStatus = Number(rawStatus);
    if (!isNaN(numStatus)) {
      if ([400, 401, 403, 404].includes(numStatus)) {
        return false;
      }
      if ([408, 429, 500, 502, 503, 504].includes(numStatus)) {
        return true;
      }
    }
  }

  const message = (error.message || '').toLowerCase();
  const code = (error.code || '').toString().toLowerCase();
  const statusStr = (typeof rawStatus === 'string' ? rawStatus : '').toLowerCase();

  // Permanent error cues: do NOT retry
  if (
    statusStr.includes('invalid_argument') ||
    statusStr.includes('permission_denied') ||
    statusStr.includes('unauthenticated') ||
    statusStr.includes('not_found') ||
    code.includes('invalid_argument') ||
    code.includes('permission_denied') ||
    code.includes('unauthenticated') ||
    code.includes('not_found') ||
    code === '400' ||
    code === '401' ||
    code === '403' ||
    code === '404' ||
    message.includes('400') ||
    message.includes('bad request') ||
    message.includes('invalid argument') ||
    message.includes('401') ||
    message.includes('unauthorized') ||
    message.includes('api_key_invalid') ||
    message.includes('api key not valid') ||
    message.includes('api key expired') ||
    message.includes('403') ||
    message.includes('permission denied') ||
    message.includes('404') ||
    message.includes('not found')
  ) {
    return false;
  }

  // Transient error cues: DO retry
  if (
    statusStr.includes('unavailable') ||
    statusStr.includes('resource_exhausted') ||
    statusStr.includes('503') ||
    statusStr.includes('429') ||
    statusStr.includes('500') ||
    statusStr.includes('502') ||
    statusStr.includes('504') ||
    statusStr.includes('408') ||
    code.includes('unavailable') ||
    code.includes('resource_exhausted') ||
    code.includes('503') ||
    code.includes('429') ||
    code.includes('500') ||
    code.includes('502') ||
    code.includes('504') ||
    code.includes('408') ||
    message.includes('503') ||
    message.includes('unavailable') ||
    message.includes('high demand') ||
    message.includes('spikes in demand') ||
    message.includes('overloaded') ||
    message.includes('429') ||
    message.includes('resource_exhausted') ||
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('500') ||
    message.includes('internal error') ||
    message.includes('502') ||
    message.includes('bad gateway') ||
    message.includes('504') ||
    message.includes('gateway timeout') ||
    message.includes('408') ||
    message.includes('timeout') ||
    message.includes('fetch failed') ||
    message.includes('econnreset') ||
    message.includes('etimedout')
  ) {
    return true;
  }

  return false;
}

/**
 * Sleep helper with random jitter
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay with random jitter.
 * Attempt 1: ~1000ms + jitter
 * Attempt 2: ~2000ms + jitter
 * Attempt 3: ~4000ms + jitter
 */
function getBackoffDelay(attemptNumber: number, baseDelayMs: number): number {
  const exponential = baseDelayMs * Math.pow(2, attemptNumber - 1);
  const jitter = Math.floor(Math.random() * 400); // 0 to 400ms random jitter
  return exponential + jitter;
}

/**
 * Checks if an error represents daily quota exhaustion (which cannot resolve with short backoff)
 */
function isDailyQuotaExhausted(error: any): boolean {
  const msg = (error?.message || '').toLowerCase();
  const rawStatus = (error?.status || '').toString().toLowerCase();
  const details = JSON.stringify(error?.details || '');
  return (
    (msg.includes('quota exceeded') || msg.includes('resource_exhausted') || rawStatus.includes('resource_exhausted')) &&
    (msg.includes('retry in') || msg.includes('generate_content_free_tier') || details.includes('GenerateRequestsPerDay'))
  );
}

/**
 * Executes a Gemini content generation request with automatic retry on transient errors
 * and fallback to an alternative model if primary retries are exhausted.
 */
export async function executeGeminiWithRetry(options: GeminiRetryOptions): Promise<any> {
  const {
    ai,
    primaryModel = 'gemini-3.8-flash',
    fallbackModel = 'gemini-3.1-flash-lite',
    contents,
    config,
    maxPrimaryRetries = 3,
    baseDelayMs = 1000,
    endpointName = '/api/extract-slots',
  } = options;

  let lastError: any = null;

  // 1. Primary Model Attempts (Initial attempt 1 + up to maxPrimaryRetries = up to 4 attempts)
  for (let attempt = 1; attempt <= maxPrimaryRetries + 1; attempt++) {
    console.log(
      `[API ${endpointName}] Attempt ${attempt}/${maxPrimaryRetries + 1} with model: ${primaryModel}`
    );

    try {
      const response = await ai.models.generateContent({
        model: primaryModel,
        contents,
        config,
      });

      console.log(`[API ${endpointName}] Success on primary attempt ${attempt} with model: ${primaryModel}`);
      (response as any).modelUsed = primaryModel;
      return response;
    } catch (err: any) {
      lastError = err;
      const isTransient = isTransientGeminiError(err);
      const rawStatus = err.status || err.statusCode || err.response?.status || 'UNKNOWN';
      const errCode = err.code || rawStatus;
      console.warn(
        `[API ${endpointName}] Primary attempt ${attempt} failed | Model: ${primaryModel} | Gemini Status: ${rawStatus} | Code: ${errCode} | Message: ${err.message || err} | Transient: ${isTransient}`
      );

      // If it's a permanent error (400, 401, 403, 404, invalid argument, permission denied), throw immediately without retries
      if (!isTransient) {
        throw err;
      }

      // If daily quota is exhausted (limit: 20 per day, retry in hours), short retries are futile -> switch to fallback immediately
      if (isDailyQuotaExhausted(err)) {
        console.log(
          `[API ${endpointName}] Primary model (${primaryModel}) daily quota is exhausted. Immediately switching to fallback model: ${fallbackModel}`
        );
        break;
      }

      // If we haven't exhausted primary retries, back off and retry
      if (attempt <= maxPrimaryRetries) {
        const delay = getBackoffDelay(attempt, baseDelayMs);
        console.log(
          `[API ${endpointName}] Transient error encountered. Retry attempt ${attempt}/${maxPrimaryRetries}. Backing off ${delay}ms before next attempt...`
        );
        await sleep(delay);
      }
    }
  }

  // 2. Primary retries exhausted with transient error -> Switch to Fallback Model
  console.log(
    `[API ${endpointName}] Primary model (${primaryModel}) retries exhausted with transient error. Switching to fallback model: ${fallbackModel}`
  );

  try {
    const fallbackResponse = await ai.models.generateContent({
      model: fallbackModel,
      contents,
      config,
    });

    console.log(`[API ${endpointName}] Success using fallback model: ${fallbackModel}`);
    (fallbackResponse as any).modelUsed = fallbackModel;
    return fallbackResponse;
  } catch (fallbackErr: any) {
    lastError = fallbackErr;
    const fallbackStatus = fallbackErr.status || fallbackErr.statusCode || 'UNKNOWN';
    const fallbackCode = fallbackErr.code || fallbackStatus;
    console.error(
      `[API ${endpointName}] Fallback attempt failed | Model: ${fallbackModel} | Gemini Status: ${fallbackStatus} | Code: ${fallbackCode} | Message: ${fallbackErr.message || fallbackErr}`
    );

    // If fallback failed with transient error, try one quick retry with fallback
    if (isTransientGeminiError(fallbackErr)) {
      const fallbackDelay = 1500 + Math.floor(Math.random() * 300);
      console.log(`[API ${endpointName}] Retrying fallback model once after ${fallbackDelay}ms...`);
      await sleep(fallbackDelay);
      try {
        const fallbackResponse2 = await ai.models.generateContent({
          model: fallbackModel,
          contents,
          config,
        });
        console.log(`[API ${endpointName}] Success on fallback retry with model: ${fallbackModel}`);
        (fallbackResponse2 as any).modelUsed = fallbackModel;
        return fallbackResponse2;
      } catch (fErr2: any) {
        lastError = fErr2;
        console.error(
          `[API ${endpointName}] Final fallback attempt failed | Model: ${fallbackModel} | Message: ${fErr2.message || fErr2}`
        );
      }
    }
  }

  // 3. If all attempts failed, throw a sanitized, user-friendly transient error
  const friendlyError = new Error(
    'Gemini Vision is temporarily unavailable. Please try again.'
  );
  (friendlyError as any).isTransient = true;
  (friendlyError as any).statusCode = 503;
  (friendlyError as any).status = 503;
  (friendlyError as any).code = 'GEMINI_UNAVAILABLE';
  (friendlyError as any).originalError = lastError?.message || String(lastError);
  throw friendlyError;
}
