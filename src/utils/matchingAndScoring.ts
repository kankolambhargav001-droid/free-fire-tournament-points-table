import {
  ScoringConfig,
  Slot,
  MatchSlotResult,
  MatchPlayerResult,
  SavedMatch,
  Tournament,
  TournamentConfig,
  TeamStanding,
  MatchBreakdown,
  PlayerStanding,
} from '../types';

export interface RawExtractedPlayer {
  playerName: string;
  kills: number | null;
  confidence?: 'high' | 'medium' | 'low';
}

export interface RawExtractedResult {
  placement: number;
  players: RawExtractedPlayer[];
  teamName?: string | null;
}

/**
 * Defensively normalizes raw output from Gemini Vision match extraction into clean RawExtractedResult[]
 */
export function normalizeMatchExtractionResponse(parsed: any): RawExtractedResult[] | null {
  if (!parsed) return null;

  let rawList: any[] | null = null;
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (Array.isArray(parsed.results)) {
    rawList = parsed.results;
  } else if (Array.isArray(parsed.placements)) {
    rawList = parsed.placements;
  } else if (Array.isArray(parsed.data)) {
    rawList = parsed.data;
  } else if (Array.isArray(parsed.standings)) {
    rawList = parsed.standings;
  } else if (Array.isArray(parsed.teams)) {
    rawList = parsed.teams;
  } else if (Array.isArray(parsed.matches)) {
    rawList = parsed.matches;
  } else if (parsed.match && Array.isArray(parsed.match.results)) {
    rawList = parsed.match.results;
  } else if (parsed.match && Array.isArray(parsed.match.placements)) {
    rawList = parsed.match.placements;
  } else if (typeof parsed === 'object') {
    for (const key of Object.keys(parsed)) {
      if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
        const first = parsed[key][0];
        if (
          first &&
          typeof first === 'object' &&
          (first.placement !== undefined ||
            first.players !== undefined ||
            first.rank !== undefined ||
            first.position !== undefined ||
            first.standing !== undefined ||
            first.teamName !== undefined)
        ) {
          rawList = parsed[key];
          break;
        }
      }
    }
  }

  if (!rawList || !Array.isArray(rawList)) {
    return null;
  }

  const placementMap = new Map<number, RawExtractedResult>();

  for (let idx = 0; idx < rawList.length; idx++) {
    const item = rawList[idx];
    if (!item || typeof item !== 'object') continue;

    let placementNum: number | null = null;
    const rawPlacement = item.placement ?? item.rank ?? item.position ?? item.standing ?? item.pos;
    if (typeof rawPlacement === 'number' && Number.isInteger(rawPlacement) && rawPlacement > 0) {
      placementNum = rawPlacement;
    } else if (typeof rawPlacement === 'string') {
      const match = rawPlacement.replace(/\D/g, '');
      if (match) {
        const parsedNum = parseInt(match, 10);
        if (!isNaN(parsedNum) && parsedNum > 0) {
          placementNum = parsedNum;
        }
      }
    }

    // If placement is omitted but the array is ordered, fallback to 1-based index
    if (!placementNum && rawList.length <= 20) {
      placementNum = idx + 1;
    }

    if (!placementNum) continue;

    const rawPlayers = Array.isArray(item.players)
      ? item.players
      : Array.isArray(item.squad)
      ? item.squad
      : Array.isArray(item.roster)
      ? item.roster
      : Array.isArray(item.members)
      ? item.members
      : [];

    const normalizedPlayers: RawExtractedPlayer[] = [];
    const seenNames = new Set<string>();

    for (const p of rawPlayers) {
      if (!p) continue;
      let name = '';
      let kills: number | null = null;
      let confidence: 'high' | 'medium' | 'low' = 'high';

      if (typeof p === 'string') {
        name = p.trim();
      } else if (typeof p === 'object') {
        name = String(
          p.playerName || p.name || p.player || p.player_name || p.userName || p.username || ''
        ).trim();
        const rawKills =
          p.kills ?? p.eliminations ?? p.killCount ?? p.kill_count ?? p.eliminationCount ?? p.kill;
        if (typeof rawKills === 'number' && !isNaN(rawKills)) {
          kills = Math.max(0, Math.floor(rawKills));
        } else if (typeof rawKills === 'string' && rawKills.trim() !== '') {
          const parsedKills = parseInt(rawKills.trim(), 10);
          if (!isNaN(parsedKills)) {
            kills = Math.max(0, parsedKills);
          }
        }
        if (p.confidence === 'low' || p.confidence === 'medium' || p.confidence === 'high') {
          confidence = p.confidence;
        }
      }

      if (!name) continue;

      const normKey = name.toLowerCase();
      if (!seenNames.has(normKey)) {
        seenNames.add(normKey);
        normalizedPlayers.push({
          playerName: name,
          kills,
          confidence,
        });
      }
    }

    const rawTeamName = typeof item.teamName === 'string' ? item.teamName.trim() : undefined;

    // Merge if same placement already seen (from multiple screenshots)
    if (placementMap.has(placementNum)) {
      const existing = placementMap.get(placementNum)!;
      const existingNameKeys = new Set(existing.players.map((p) => p.playerName.toLowerCase()));
      for (const p of normalizedPlayers) {
        if (!existingNameKeys.has(p.playerName.toLowerCase())) {
          existing.players.push(p);
          existingNameKeys.add(p.playerName.toLowerCase());
        }
      }
      if (!existing.teamName && rawTeamName) {
        existing.teamName = rawTeamName;
      }
    } else {
      placementMap.set(placementNum, {
        placement: placementNum,
        players: normalizedPlayers,
        teamName: rawTeamName,
      });
    }
  }

  const results = Array.from(placementMap.values()).sort((a, b) => a.placement - b.placement);
  return results.length > 0 ? results : null;
}

/**
 * Normalizes a player name for matching purposes only.
 * Does NOT alter the original verbatim display name.
 */
export function normalizeNameForMatching(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    // Normalize NFKD for Unicode characters
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Calculates placement, kill, and total points using tournament scoring configuration.
 */
export function calculateSlotPoints(
  placement: number,
  totalKills: number,
  scoring: ScoringConfig
): { placementPoints: number; killPoints: number; totalPoints: number } {
  const placementPoints = scoring.placementPoints[placement] ?? 0;
  const killPoints = Math.max(0, totalKills) * (scoring.pointsPerKill ?? 1);
  const totalPoints = placementPoints + killPoints;

  return { placementPoints, killPoints, totalPoints };
}

/**
 * Maps extracted players from match screenshots to the saved tournament Slot List.
 */
export function mapExtractedResultsToSlots(
  rawResults: RawExtractedResult[],
  savedSlots: Slot[],
  scoring: ScoringConfig
): MatchSlotResult[] {
  // Pre-index saved slot players
  const playerToSlotMap = new Map<string, number[]>(); // normalizedName -> slotNumbers[]

  savedSlots.forEach((slot) => {
    slot.players.forEach((player) => {
      const norm = normalizeNameForMatching(player.name);
      if (norm) {
        const current = playerToSlotMap.get(norm) || [];
        if (!current.includes(slot.slotNumber)) {
          current.push(slot.slotNumber);
        }
        playerToSlotMap.set(norm, current);
      }
    });
  });

  const assignedSlotNumbers = new Set<number>();

  return rawResults.map((raw) => {
    // Tally potential slots for players in this placement
    const slotVotes = new Map<number, number>();
    const playerResults: MatchPlayerResult[] = [];

    raw.players.forEach((p) => {
      const rawName = p.playerName;
      const norm = normalizeNameForMatching(rawName);

      let matchedSlot: number | undefined;
      let status: 'matched' | 'ambiguous' | 'unmatched' = 'unmatched';

      const possibleSlots = playerToSlotMap.get(norm) || [];

      if (possibleSlots.length === 1) {
        matchedSlot = possibleSlots[0];
        status = 'matched';
        slotVotes.set(matchedSlot, (slotVotes.get(matchedSlot) || 0) + 1);
      } else if (possibleSlots.length > 1) {
        status = 'ambiguous';
      } else {
        // Try substring / fuzzy containment check
        for (const [savedNorm, slots] of playerToSlotMap.entries()) {
          if (savedNorm.includes(norm) || norm.includes(savedNorm)) {
            if (slots.length === 1) {
              matchedSlot = slots[0];
              status = 'matched';
              slotVotes.set(matchedSlot, (slotVotes.get(matchedSlot) || 0) + 1);
              break;
            }
          }
        }
      }

      playerResults.push({
        playerName: rawName,
        kills: p.kills ?? 0,
        confidence: p.confidence || (status === 'matched' ? 'high' : 'medium'),
        needsReview: status !== 'matched' || p.confidence === 'low' || p.kills === null,
        matchedSlotNumber: matchedSlot,
        matchStatus: status,
      });
    });

    // Determine winning slot based on highest player votes
    let bestSlotNumber: number | undefined;
    let maxVotes = 0;
    let isAmbiguousSlot = false;

    slotVotes.forEach((votes, slotNum) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        bestSlotNumber = slotNum;
        isAmbiguousSlot = false;
      } else if (votes === maxVotes) {
        isAmbiguousSlot = true;
      }
    });

    // If ambiguous or no votes, fallback
    const resolvedSlotNumber = !isAmbiguousSlot && bestSlotNumber ? bestSlotNumber : undefined;
    if (resolvedSlotNumber) {
      assignedSlotNumbers.add(resolvedSlotNumber);
    }

    const matchedSavedSlot = savedSlots.find((s) => s.slotNumber === resolvedSlotNumber);
    const teamName =
      matchedSavedSlot?.teamName ||
      raw.teamName ||
      (resolvedSlotNumber ? `Slot ${resolvedSlotNumber}` : `Squad #${raw.placement}`);

    // The scoring source of truth is always the sum of individual player kills.
    // Aggregate numbers visible elsewhere in a screenshot are intentionally ignored.
    const totalKills = playerResults.reduce((acc, p) => acc + (p.kills || 0), 0);

    // Compute points
    const { placementPoints, killPoints, totalPoints } = calculateSlotPoints(
      raw.placement,
      totalKills,
      scoring
    );

    // Determine warning status
    let warningMessage: string | undefined;
    let status: 'valid' | 'warning' | 'needs_review' = 'valid';

    if (!resolvedSlotNumber) {
      status = 'needs_review';
      warningMessage = 'Slot could not be uniquely matched to the saved slot roster.';
    } else if (playerResults.some((p) => p.needsReview || p.matchStatus !== 'matched')) {
      status = 'warning';
      warningMessage = 'Some players require review or were not found in the slot list.';
    }

    return {
      placement: raw.placement,
      slotNumber: resolvedSlotNumber,
      teamName,
      players: playerResults,
      totalKills,
      placementPoints,
      killPoints,
      totalPoints,
      status,
      warningMessage,
    };
  });
}

/**
 * Validates the entire match results set against tournament configuration.
 */
export function validateMatchResults(
  results: MatchSlotResult[],
  teamCount: number
): {
  missingPlacements: number[];
  duplicatePlacements: number[];
  duplicateSlots: number[];
  unresolvedSlotsCount: number;
} {
  const placementCounts = new Map<number, number>();
  const slotCounts = new Map<number, number>();

  results.forEach((r) => {
    placementCounts.set(r.placement, (placementCounts.get(r.placement) || 0) + 1);
    if (r.slotNumber) {
      slotCounts.set(r.slotNumber, (slotCounts.get(r.slotNumber) || 0) + 1);
    }
  });

  const duplicatePlacements: number[] = [];
  placementCounts.forEach((count, plc) => {
    if (count > 1) duplicatePlacements.push(plc);
  });

  const duplicateSlots: number[] = [];
  slotCounts.forEach((count, slotNum) => {
    if (count > 1) duplicateSlots.push(slotNum);
  });

  const missingPlacements: number[] = [];
  for (let i = 1; i <= teamCount; i++) {
    if (!placementCounts.has(i)) {
      missingPlacements.push(i);
    }
  }

  const unresolvedSlotsCount = results.filter((r) => !r.slotNumber || r.status === 'needs_review').length;

  return {
    missingPlacements,
    duplicatePlacements,
    duplicateSlots,
    unresolvedSlotsCount,
  };
}

/**
 * Calculates cumulative tournament standings derived from saved match results.
 * Pure function: Never recalculates saved match scores; sums saved match values.
 * Applies competition ranking for ties (e.g. 1, 2, 2, 4).
 */
export function calculateTournamentStandings(
  tournament: Tournament | TournamentConfig,
  slots: Slot[],
  savedMatches: Record<number, SavedMatch> | undefined
): TeamStanding[] {
  // If no saved matches exist at all, return empty array so UI shows the empty state
  if (!savedMatches || Object.keys(savedMatches).length === 0) {
    return [];
  }

  const validMatchKeys = Object.keys(savedMatches)
    .map(Number)
    .filter((n) => !isNaN(n) && savedMatches[n]?.results?.length > 0);

  if (validMatchKeys.length === 0) {
    return [];
  }

  // Get all configured slots. If empty, generate 1 to teamCount
  const teamSlots: Slot[] = slots && slots.length > 0 ? slots : [];
  if (teamSlots.length === 0) {
    for (let i = 1; i <= (tournament.teamCount || 12); i++) {
      teamSlots.push({
        slotNumber: i,
        teamName: `Slot ${i}`,
        players: [],
      });
    }
  }

  const totalMatchesConfigured = tournament.matchCount || 3;

  const standings: TeamStanding[] = teamSlots.map((slot) => {
    let totalPoints = 0;
    let totalKills = 0;
    let totalPlacementPoints = 0;
    let totalKillPoints = 0;
    let matchesPlayed = 0;
    let booyahs = 0;
    const matchPoints: Record<number, number | null> = {};
    const matchBreakdowns: Record<number, MatchBreakdown> = {};

    for (let m = 1; m <= totalMatchesConfigured; m++) {
      const matchData = savedMatches[m];
      if (matchData && matchData.results && matchData.results.length > 0) {
        // Find result matching this slot
        const slotResult = matchData.results.find((r) => r.slotNumber === slot.slotNumber);
        if (slotResult) {
          matchPoints[m] = slotResult.totalPoints;
          matchBreakdowns[m] = {
            placement: slotResult.placement,
            kills: slotResult.totalKills,
            placementPoints: slotResult.placementPoints,
            killPoints: slotResult.killPoints,
            totalPoints: slotResult.totalPoints,
          };
          totalPoints += slotResult.totalPoints;
          totalKills += slotResult.totalKills;
          totalPlacementPoints += slotResult.placementPoints;
          totalKillPoints += slotResult.killPoints;
          matchesPlayed += 1;
          if (slotResult.placement === 1) {
            booyahs += 1;
          }
        } else {
          // Slot was present, match played, but no points
          matchPoints[m] = 0;
        }
      } else {
        // Match not yet played/saved
        matchPoints[m] = null;
      }
    }

    return {
      rank: 1, // updated below
      slotNumber: slot.slotNumber,
      teamName: slot.teamName || `Slot ${slot.slotNumber}`,
      teamTag: slot.teamTag || `S${slot.slotNumber}`,
      matchesPlayed,
      matchPoints,
      matchBreakdowns,
      placementPoints: totalPlacementPoints,
      totalPlacementPoints,
      kills: totalKills,
      totalKills,
      killPoints: totalKillPoints,
      totalKillPoints,
      totalPoints,
      booyahs,
    };
  });

  // Sort: primary rule is TOTAL POINTS DESCENDING
  standings.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    // Stable secondary sort by slot number
    return (a.slotNumber ?? 0) - (b.slotNumber ?? 0);
  });

  // Competition ranking for ties:
  // Team A (50) -> Rank 1
  // Team B (45) -> Rank 2
  // Team C (45) -> Rank 2
  // Team D (40) -> Rank 4
  let currentRank = 1;
  for (let i = 0; i < standings.length; i++) {
    if (i > 0 && standings[i].totalPoints < standings[i - 1].totalPoints) {
      currentRank = i + 1;
    }
    standings[i].rank = currentRank;
  }

  // Detect ties
  const rankCounts = new Map<number, number>();
  standings.forEach((s) => {
    rankCounts.set(s.rank, (rankCounts.get(s.rank) || 0) + 1);
  });
  standings.forEach((s) => {
    s.isTied = (rankCounts.get(s.rank) || 0) > 1;
  });

  return standings;
}


/**
 * Builds a tournament-wide player leaderboard from the same saved match data
 * used by team standings. Player MVP is based strictly on cumulative kills.
 * Ties are retained as joint MVPs rather than inventing a hidden tiebreaker.
 */
export function calculatePlayerStandings(
  slots: Slot[],
  savedMatches: Record<number, SavedMatch> | undefined
): PlayerStanding[] {
  type Accumulator = PlayerStanding & { normalizedName: string };

  const normalize = (value: string) =>
    value
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const byPlayer = new Map<string, Accumulator>();
  const rosterBySlot = new Map<number, Slot>();

  // Start with the complete registered roster. This guarantees that every
  // player appears in the player leaderboard, including players with 0 kills.
  slots.forEach((slot) => {
    rosterBySlot.set(slot.slotNumber, slot);

    for (const rosterPlayer of slot.players || []) {
      const canonicalName = String(rosterPlayer.name || '').trim();
      if (!canonicalName) continue;

      const normalizedName = normalize(canonicalName);
      if (!normalizedName) continue;

      const key = `${slot.slotNumber}::${normalizedName}`;
      if (!byPlayer.has(key)) {
        byPlayer.set(key, {
          normalizedName,
          playerName: canonicalName,
          teamName: slot.teamName || `Slot ${slot.slotNumber}`,
          slotNumber: slot.slotNumber,
          matchesPlayed: 0,
          kills: 0,
          killPoints: 0,
          totalPoints: 0,
          isMvp: false,
        });
      }
    }
  });

  for (const match of Object.values(savedMatches || {})) {
    if (!match?.results?.length) continue;

    for (const teamResult of match.results) {
      const slotNumber = teamResult.slotNumber;
      const roster = slotNumber ? rosterBySlot.get(slotNumber) : undefined;
      const teamName = teamResult.teamName || roster?.teamName || `Slot ${slotNumber ?? '?'}`;

      // Count the match for roster players that actually appeared in the
      // extracted result. Players absent from the screenshot remain at 0.
      const seenPlayers = new Set<string>();

      for (const player of teamResult.players || []) {
        const rawName = String(player.playerName || '').trim();
        if (!rawName) continue;

        const rosterPlayer = roster?.players.find(
          (candidate) => normalize(candidate.name) === normalize(rawName)
        );
        const canonicalName = rosterPlayer?.name?.trim() || rawName;
        const normalizedName = normalize(canonicalName);
        const key = `${slotNumber ?? 'unknown'}::${normalizedName}`;
        const kills = Math.max(0, Number(player.kills ?? 0));

        let existing = byPlayer.get(key);
        if (!existing) {
          existing = {
            normalizedName,
            playerName: canonicalName,
            teamName,
            slotNumber,
            matchesPlayed: 0,
            kills: 0,
            killPoints: 0,
            totalPoints: 0,
            isMvp: false,
          };
          byPlayer.set(key, existing);
        }

        existing.kills += kills;
        existing.killPoints += kills;
        existing.totalPoints += kills;
        existing.matchesPlayed += 1;
        seenPlayers.add(key);
      }

      // If a roster player was not included in a valid team result, do not
      // invent a match appearance for them. Their cumulative kills remain 0.
      void seenPlayers;
    }
  }

  const players = Array.from(byPlayer.values()).map(({ normalizedName: _normalizedName, ...player }) => player);
  const maxKills = players.length > 0 ? Math.max(...players.map((p) => p.kills)) : 0;

  players.forEach((player) => {
    player.isMvp = maxKills > 0 && player.kills === maxKills;
  });

  players.sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills;
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return a.playerName.localeCompare(b.playerName);
  });

  return players;
}

