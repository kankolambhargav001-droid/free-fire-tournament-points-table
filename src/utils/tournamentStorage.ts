import {
  TournamentConfig,
  SlotList,
  SavedMatch,
  PointsTableDesignConfig,
  Slot,
  ScoringConfig,
  TableSettingsConfig,
} from '../types';

export const UNIFIED_STORAGE_KEY = 'tp_tournaments_v1';
export const LEGACY_SLOTS_KEY = 'tp_slot_lists_v1';
export const LEGACY_MATCHES_KEY = 'tp_saved_matches_v1';
export const LEGACY_DESIGNS_KEY = 'tp_designs_v1';

export interface StoredTournamentRecord {
  tournament: TournamentConfig;
  slotList?: SlotList;
  savedMatches?: Record<number, SavedMatch>;
  design?: PointsTableDesignConfig;
}

export interface UnifiedTournamentStorage {
  version: 1;
  tournaments: Record<string, StoredTournamentRecord>;
}

export const DEFAULT_FREE_FIRE_POINTS: Record<number, number> = {
  1: 12,
  2: 9,
  3: 8,
  4: 7,
  5: 6,
  6: 5,
  7: 4,
  8: 3,
  9: 2,
  10: 1,
  11: 0,
  12: 0,
};

export const DEFAULT_SCORING: ScoringConfig = {
  preset: 'Free Fire Standard',
  placementPoints: { ...DEFAULT_FREE_FIRE_POINTS },
  pointsPerKill: 1,
};

export const DEFAULT_TABLE_SETTINGS: TableSettingsConfig = {
  showKills: true,
  showPlacement: true,
  showMatchPoints: true,
  showTotalPoints: true,
  heading: 'POINT TABLE',
  subtitle: 'Daily Practice Match',
  organizer: 'Vortex Esports Org',
};

export const createDefaultDesignConfig = (
  tournamentName?: string,
  organizer?: string,
  matchCount?: number
): PointsTableDesignConfig => {
  const count = matchCount || 3;
  const visibleMatches: Record<number, boolean> = {};
  for (let i = 1; i <= count; i++) {
    visibleMatches[i] = true;
  }

  return {
    heading: tournamentName?.toUpperCase() || '9 PM PRACTICE',
    subtitle: 'OVERALL POINTS TABLE',
    organizer: organizer || 'Tournament Organizer',
    showOrganizer: true,
    showDate: true,
    showRank: true,
    showTeam: true,
    showBooyahs: true,
    showMatchPoints: true,
    visibleMatches,
    showKills: true,
    showPlacementPoints: true,
    showKillPoints: false,
    showTotalPoints: true,
    showPodium: false,
    showWatermark: true,
    teamDisplay: 'all',
    customTeamCount: 12,
    format: '4:5',
    theme: 'gold',
    typography: 'large',
    tableStyle: 'broadcast',
    visualVersion: 4,
  };
};

/**
 * Creates seed tournament records for initial launch if storage is completely empty.
 */
function createInitialSeedRecords(): Record<string, StoredTournamentRecord> {
  // Production starts empty. Tournament data is loaded from the authenticated
  // organizer's Firestore collection by TournamentContext.
  return {};
}

/**
 * Safely parse JSON from localStorage with fallback.
 */
function safeParseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (err) {
    console.warn('Failed to parse localStorage JSON, using fallback', err);
    return fallback;
  }
}

/**
 * Migrates data from legacy keys (tp_slot_lists_v1, tp_saved_matches_v1, tp_designs_v1,
 * or legacy array tp_tournaments_v1) into the unified structure.
 */
function migrateStorage(): UnifiedTournamentStorage {
  const records: Record<string, StoredTournamentRecord> = {};

  // 1. Inspect existing tp_tournaments_v1
  const rawTournaments = typeof localStorage !== 'undefined' ? localStorage.getItem(UNIFIED_STORAGE_KEY) : null;
  if (rawTournaments) {
    const parsed = safeParseJSON<any>(rawTournaments, null);

    // If already unified schema { version: 1, tournaments: { ... } }
    if (parsed && typeof parsed === 'object' && parsed.tournaments && typeof parsed.tournaments === 'object') {
      Object.entries(parsed.tournaments).forEach(([id, rec]: [string, any]) => {
        if (rec && typeof rec === 'object' && rec.tournament && rec.tournament.id) {
          records[id] = {
            tournament: rec.tournament,
            slotList: rec.slotList,
            savedMatches: rec.savedMatches || {},
            design: rec.design,
          };
        }
      });
    } else if (Array.isArray(parsed) && parsed.length > 0) {
      // Legacy array format of TournamentConfig[]
      parsed.forEach((t: TournamentConfig) => {
        if (t && t.id) {
          records[t.id] = {
            tournament: t,
            savedMatches: {},
          };
        }
      });
    }
  }

  // 2. Migrate legacy slot lists (tp_slot_lists_v1)
  const rawSlots = typeof localStorage !== 'undefined' ? localStorage.getItem(LEGACY_SLOTS_KEY) : null;
  if (rawSlots) {
    const parsedSlots = safeParseJSON<Record<string, SlotList>>(rawSlots, {});
    if (parsedSlots && typeof parsedSlots === 'object') {
      Object.entries(parsedSlots).forEach(([tId, slotList]) => {
        if (slotList && Array.isArray(slotList.slots)) {
          if (records[tId]) {
            if (!records[tId].slotList) {
              records[tId].slotList = slotList;
            }
          } else {
            // Reconstruct minimal tournament record so slots are not lost
            records[tId] = {
              tournament: {
                id: tId,
                name: 'Tournament',
                subtitle: '',
                organizer: '',
                date: new Date().toISOString().split('T')[0],
                teamCount: slotList.slots.length || 12,
                playersPerTeam: 4,
                matchCount: 3,
                completedMatches: 0,
                status: 'in_progress',
                lastUpdated: 'Just now',
                game: 'Free Fire',
                scoring: DEFAULT_SCORING,
                tableSettings: DEFAULT_TABLE_SETTINGS,
              },
              slotList,
              savedMatches: {},
            };
          }
        }
      });
    }
  }

  // 3. Migrate legacy matches (tp_saved_matches_v1)
  const rawMatches = typeof localStorage !== 'undefined' ? localStorage.getItem(LEGACY_MATCHES_KEY) : null;
  if (rawMatches) {
    const parsedMatches = safeParseJSON<Record<string, Record<string | number, SavedMatch>>>(rawMatches, {});
    if (parsedMatches && typeof parsedMatches === 'object') {
      Object.entries(parsedMatches).forEach(([tId, matchMap]) => {
        if (matchMap && typeof matchMap === 'object') {
          const formattedMatches: Record<number, SavedMatch> = {};
          Object.entries(matchMap).forEach(([mNumStr, match]) => {
            const mNum = Number(mNumStr);
            if (!isNaN(mNum) && match && match.results) {
              formattedMatches[mNum] = match;
            }
          });

          if (records[tId]) {
            records[tId].savedMatches = {
              ...(records[tId].savedMatches || {}),
              ...formattedMatches,
            };
          } else {
            records[tId] = {
              tournament: {
                id: tId,
                name: 'Tournament',
                subtitle: '',
                organizer: '',
                date: new Date().toISOString().split('T')[0],
                teamCount: 12,
                playersPerTeam: 4,
                matchCount: Math.max(3, ...Object.keys(formattedMatches).map(Number)),
                completedMatches: Object.keys(formattedMatches).length,
                status: 'in_progress',
                lastUpdated: 'Just now',
                game: 'Free Fire',
                scoring: DEFAULT_SCORING,
                tableSettings: DEFAULT_TABLE_SETTINGS,
              },
              savedMatches: formattedMatches,
            };
          }
        }
      });
    }
  }

  // 4. Migrate legacy designs (tp_designs_v1)
  const rawDesigns = typeof localStorage !== 'undefined' ? localStorage.getItem(LEGACY_DESIGNS_KEY) : null;
  if (rawDesigns) {
    const parsedDesigns = safeParseJSON<Record<string, PointsTableDesignConfig>>(rawDesigns, {});
    if (parsedDesigns && typeof parsedDesigns === 'object') {
      Object.entries(parsedDesigns).forEach(([tId, design]) => {
        if (design && records[tId] && !records[tId].design) {
          records[tId].design = design;
        }
      });
    }
  }

  // 5. If still completely empty, seed initial tournament
  if (Object.keys(records).length === 0) {
    const seed = createInitialSeedRecords();
    Object.assign(records, seed);
  }

  const unified: UnifiedTournamentStorage = {
    version: 1,
    tournaments: records,
  };

  // Persist the migrated unified store immediately
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(UNIFIED_STORAGE_KEY, JSON.stringify(unified));
    }
  } catch (err) {
    console.error('Failed to save migrated tournament storage:', err);
  }

  return unified;
}

/**
 * Loads all tournament records from unified localStorage.
 * Performs safe parsing and non-destructive migration on start.
 */
export function loadTournamentStorage(): UnifiedTournamentStorage {
  return { version: 1, tournaments: {} };
}

/**
 * Persists the entire unified storage object to localStorage immediately.
 */
export function persistUnifiedStorage(storage: UnifiedTournamentStorage): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(UNIFIED_STORAGE_KEY, JSON.stringify(storage));
  } catch (err) {
    console.error('Critical error persisting unified tournament storage:', err);
  }
}

/**
 * Saves or updates a specific tournament record and persists immediately.
 */
export function saveTournamentRecord(
  tournamentId: string,
  updater: (prev: StoredTournamentRecord | undefined) => StoredTournamentRecord
): UnifiedTournamentStorage {
  const current = loadTournamentStorage();
  const existing = current.tournaments[tournamentId];
  const updated = updater(existing);

  current.tournaments[tournamentId] = updated;
  persistUnifiedStorage(current);
  return current;
}

/**
 * Removes a tournament from storage and persists immediately.
 */
export function removeTournamentRecord(tournamentId: string): UnifiedTournamentStorage {
  const current = loadTournamentStorage();
  delete current.tournaments[tournamentId];
  persistUnifiedStorage(current);
  return current;
}

export interface DuplicateTournamentOptions {
  copySlotList?: boolean;
  copySavedMatches?: boolean;
  copyDesign?: boolean;
  customName?: string;
}

/**
 * Duplicates a tournament into a new completely independent record with a unique ID.
 */
export function duplicateTournamentRecord(
  sourceTournamentId: string,
  options: DuplicateTournamentOptions = { copySlotList: true, copySavedMatches: false, copyDesign: true }
): { newTournamentId: string; storage: UnifiedTournamentStorage } {
  const current = loadTournamentStorage();
  const existing = current.tournaments[sourceTournamentId];
  if (!existing) {
    throw new Error(`Tournament ${sourceTournamentId} not found.`);
  }

  const slug = (existing.tournament.name || 'tournament')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'tournament';
  const newTournamentId = `t-${slug}-copy-${Date.now().toString(36)}`;

  // Deep clone tournament config
  const newTournament: TournamentConfig = JSON.parse(JSON.stringify(existing.tournament));
  newTournament.id = newTournamentId;
  newTournament.name = options.customName?.trim() || `${existing.tournament.name} (Copy)`;
  newTournament.lastUpdated = 'Just now';

  // 1. Slot list
  let newSlotList: SlotList | undefined = undefined;
  if (options.copySlotList && existing.slotList) {
    newSlotList = JSON.parse(JSON.stringify(existing.slotList));
    if (newSlotList) {
      newSlotList.tournamentId = newTournamentId;
    }
  }

  // 2. Saved matches
  let newSavedMatches: Record<number, SavedMatch> = {};
  if (options.copySavedMatches && existing.savedMatches) {
    newSavedMatches = JSON.parse(JSON.stringify(existing.savedMatches));
    Object.values(newSavedMatches).forEach((m) => {
      m.tournamentId = newTournamentId;
    });
    const completedCount = Object.keys(newSavedMatches).filter(
      (k) => newSavedMatches[Number(k)]?.results?.length > 0
    ).length;
    newTournament.completedMatches = completedCount;
    newTournament.status = completedCount >= newTournament.matchCount ? 'completed' : 'in_progress';
  } else {
    newTournament.completedMatches = 0;
    newTournament.status = 'in_progress';
  }

  // 3. Design
  let newDesign: PointsTableDesignConfig;
  if (options.copyDesign && existing.design) {
    newDesign = JSON.parse(JSON.stringify(existing.design));
    newDesign.heading = newTournament.name.toUpperCase();
  } else {
    newDesign = createDefaultDesignConfig(
      newTournament.name,
      newTournament.organizer,
      newTournament.matchCount
    );
  }

  current.tournaments[newTournamentId] = {
    tournament: newTournament,
    slotList: newSlotList,
    savedMatches: newSavedMatches,
    design: newDesign,
  };

  persistUnifiedStorage(current);
  return { newTournamentId, storage: current };
}

/**
 * Resets a tournament's dynamic match results and slots while preserving its configuration and design.
 */
export function resetTournamentRecord(tournamentId: string): UnifiedTournamentStorage {
  const current = loadTournamentStorage();
  const existing = current.tournaments[tournamentId];
  if (!existing) return current;

  current.tournaments[tournamentId] = {
    ...existing,
    tournament: {
      ...existing.tournament,
      completedMatches: 0,
      status: 'in_progress',
      lastUpdated: 'Just now',
    },
    slotList: undefined,
    savedMatches: {},
  };

  persistUnifiedStorage(current);
  return current;
}

/**
 * Deletes a single match result without renumbering other matches.
 */
export function deleteSavedMatchRecord(
  tournamentId: string,
  matchNumber: number
): UnifiedTournamentStorage {
  const current = loadTournamentStorage();
  const existing = current.tournaments[tournamentId];
  if (!existing || !existing.savedMatches) return current;

  delete existing.savedMatches[matchNumber];

  const remainingKeys = Object.keys(existing.savedMatches).map(Number);
  const completedCount = remainingKeys.filter(
    (k) => existing.savedMatches && existing.savedMatches[k]?.results?.length > 0
  ).length;

  existing.tournament.completedMatches = completedCount;
  existing.tournament.status =
    completedCount >= existing.tournament.matchCount ? 'completed' : 'in_progress';
  existing.tournament.lastUpdated = 'Just now';

  persistUnifiedStorage(current);
  return current;
}

/**
 * Clears saved slot list for a tournament while preserving match results.
 */
export function resetSlotListRecord(tournamentId: string): UnifiedTournamentStorage {
  const current = loadTournamentStorage();
  const existing = current.tournaments[tournamentId];
  if (!existing) return current;

  existing.slotList = undefined;
  existing.tournament.lastUpdated = 'Just now';

  persistUnifiedStorage(current);
  return current;
}

/**
 * Formats last updated string for user-friendly display.
 */
export function formatLastUpdated(timestampOrStr?: string): string {
  if (!timestampOrStr) return 'Just now';
  if (timestampOrStr === 'Just now') return 'Just now';

  const date = new Date(timestampOrStr);
  if (isNaN(date.getTime())) {
    return timestampOrStr;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

