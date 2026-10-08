import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  TournamentConfig,
  ScoringConfig,
  TableSettingsConfig,
  PointsTableDesignConfig,
  Slot,
  SlotList,
  MatchSummary,
  TeamStanding,
  SavedMatch,
} from '../types';
import { calculateTournamentStandings } from '../utils/matchingAndScoring';
import {
  UnifiedTournamentStorage,
  StoredTournamentRecord,
  DEFAULT_FREE_FIRE_POINTS,
  DEFAULT_SCORING,
  DEFAULT_TABLE_SETTINGS,
  createDefaultDesignConfig,
  DuplicateTournamentOptions,
  formatLastUpdated,
} from '../utils/tournamentStorage';
import { loadOrganizerStorage, syncOrganizerStorage } from '../services/organizerCloud';

// Re-export standard defaults for backward compatibility across pages
export {
  DEFAULT_FREE_FIRE_POINTS,
  DEFAULT_SCORING,
  DEFAULT_TABLE_SETTINGS,
  createDefaultDesignConfig,
  formatLastUpdated,
};
export type { DuplicateTournamentOptions };

export interface TournamentContextType {
  tournaments: TournamentConfig[];
  createTournament: (
    config: Omit<TournamentConfig, 'id' | 'status' | 'completedMatches' | 'lastUpdated' | 'game'>
  ) => string;
  updateTournament: (id: string, updates: Partial<TournamentConfig>) => void;
  deleteTournament: (id: string) => void;
  duplicateTournament: (id: string, options?: DuplicateTournamentOptions) => string;
  resetTournamentData: (id: string) => void;
  getTournament: (id: string) => TournamentConfig | undefined;
  getSlotsForTournament: (id: string) => Slot[];
  getMatchesForTournament: (id: string) => MatchSummary[];
  getStandingsForTournament: (id: string) => TeamStanding[];
  getSlotList: (tournamentId: string) => SlotList | undefined;
  saveSlotList: (slotList: SlotList) => void;
  updateSlotList: (tournamentId: string, slots: Slot[]) => void;
  resetSlotList: (tournamentId: string) => void;
  getSavedMatch: (tournamentId: string, matchNumber: number) => SavedMatch | undefined;
  getAllSavedMatches: (tournamentId: string) => Record<number, SavedMatch> | undefined;
  saveMatch: (match: SavedMatch) => void;
  deleteSavedMatch: (tournamentId: string, matchNumber: number) => void;
  getTournamentDesign: (tournamentId: string) => PointsTableDesignConfig;
  saveTournamentDesign: (tournamentId: string, config: PointsTableDesignConfig) => void;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading, isAuthorized } = useAuth();
  const [storage, setStorage] = useState<UnifiedTournamentStorage>(() => ({ version: 1, tournaments: {} }));

  // Firestore is the source of truth. Every organizer loads only their own
  // private tournament collection after authentication is verified.
  useEffect(() => {
    let cancelled = false;
    if (authLoading) return () => { cancelled = true; };

    if (!user || !isAuthorized) {
      setStorage({ version: 1, tournaments: {} });
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        const cloudStorage = await loadOrganizerStorage(user.uid);
        if (!cancelled) setStorage(cloudStorage);
      } catch (error) {
        console.error('Failed to load organizer tournaments from Firestore:', error);
        if (!cancelled) setStorage({ version: 1, tournaments: {} });
      }
    })();

    return () => { cancelled = true; };
  }, [user, isAuthorized, authLoading]);

  // UI updates immediately; the same change is persisted to the signed-in
  // organizer's Firestore namespace in the background.
  const commitStorageUpdate = useCallback(
    (updater: (prev: UnifiedTournamentStorage) => UnifiedTournamentStorage) => {
      setStorage((prev) => {
        const next = updater(prev);
        if (user && isAuthorized) {
          syncOrganizerStorage(user.uid, prev, next).catch((error) => {
            console.error('Failed to save tournament data to Firestore:', error);
          });
        }
        return next;
      });
    },
    [user, isAuthorized]
  );

  // Expose tournaments array
  const tournaments: TournamentConfig[] = Object.values(storage.tournaments).map((r) => r.tournament);

  const getTournament = useCallback(
    (id: string): TournamentConfig | undefined => {
      return storage.tournaments[id]?.tournament;
    },
    [storage]
  );

  const createTournament = useCallback(
    (data: Omit<TournamentConfig, 'id' | 'status' | 'completedMatches' | 'lastUpdated' | 'game'>): string => {
      const slug =
        data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || 'tournament';
      const id = `t-${slug}-${Date.now().toString(36)}`;

      const newTournament: TournamentConfig = {
        ...data,
        id,
        status: 'in_progress',
        completedMatches: 0,
        lastUpdated: 'Just now',
        game: 'Free Fire',
      };

      const record: StoredTournamentRecord = {
        tournament: newTournament,
        savedMatches: {},
        design: createDefaultDesignConfig(newTournament.name, newTournament.organizer, newTournament.matchCount),
      };

      // Persist immediately to prevent loss on navigation
      commitStorageUpdate((prev) => ({
        ...prev,
        tournaments: {
          [id]: record,
          ...prev.tournaments,
        },
      }));

      return id;
    },
    [commitStorageUpdate]
  );

  const updateTournament = useCallback(
    (id: string, updates: Partial<TournamentConfig>) => {
      commitStorageUpdate((prev) => {
        const existing = prev.tournaments[id];
        if (!existing) return prev;

        const updatedTournament: TournamentConfig = {
          ...existing.tournament,
          ...updates,
          lastUpdated: 'Just now',
        };

        return {
          ...prev,
          tournaments: {
            ...prev.tournaments,
            [id]: {
              ...existing,
              tournament: updatedTournament,
            },
          },
        };
      });
    },
    [commitStorageUpdate]
  );

  const getSlotList = useCallback(
    (tournamentId: string): SlotList | undefined => {
      return storage.tournaments[tournamentId]?.slotList;
    },
    [storage]
  );

  const saveSlotList = useCallback(
    (slotList: SlotList) => {
      const tid = slotList.tournamentId;
      commitStorageUpdate((prev) => {
        const existing = prev.tournaments[tid];
        const baseTournament =
          existing?.tournament || {
            id: tid,
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
          };

        const updatedRecord: StoredTournamentRecord = {
          ...(existing || { tournament: baseTournament }),
          tournament: baseTournament,
          slotList: {
            ...slotList,
            isSaved: true,
            extractedAt: slotList.extractedAt || new Date().toISOString(),
          },
        };

        return {
          ...prev,
          tournaments: {
            ...prev.tournaments,
            [tid]: updatedRecord,
          },
        };
      });
    },
    [commitStorageUpdate]
  );

  const updateSlotList = useCallback(
    (tournamentId: string, slots: Slot[]) => {
      commitStorageUpdate((prev) => {
        const existing = prev.tournaments[tournamentId];
        if (!existing) return prev;

        const existingSlotList = existing.slotList || {
          tournamentId,
          slots: [],
          sourceImages: [],
          isSaved: true,
          extractedAt: new Date().toISOString(),
        };

        const updatedRecord: StoredTournamentRecord = {
          ...existing,
          slotList: {
            ...existingSlotList,
            slots,
            isSaved: true,
          },
        };

        return {
          ...prev,
          tournaments: {
            ...prev.tournaments,
            [tournamentId]: updatedRecord,
          },
        };
      });
    },
    [commitStorageUpdate]
  );

  // Returns ONLY this tournament's slots, or isolated template slots if not yet configured
  const getSlotsForTournament = useCallback(
    (id: string): Slot[] => {
      const tourneyRecord = storage.tournaments[id];
      if (tourneyRecord?.slotList?.slots && tourneyRecord.slotList.slots.length > 0) {
        return tourneyRecord.slotList.slots;
      }

      // Generate clean isolated template slots for this tournament
      const tournament = tourneyRecord?.tournament;
      const count = tournament?.teamCount || 12;
      const playersPerSquad = tournament?.playersPerTeam || 4;

      const templateSlots: Slot[] = [];
      for (let i = 1; i <= count; i++) {
        templateSlots.push({
          slotNumber: i,
          teamName: `Slot ${i}`,
          teamTag: `S${i}`,
          status: 'empty',
          players: Array.from({ length: playersPerSquad }).map((_, pIdx) => ({
            id: `p-${i}-${pIdx + 1}`,
            name: `Player ${pIdx + 1}`,
            role: pIdx === 0 ? 'IGL' : 'Player',
            confidence: 'high',
          })),
        });
      }
      return templateSlots;
    },
    [storage]
  );

  const getSavedMatch = useCallback(
    (tournamentId: string, matchNumber: number): SavedMatch | undefined => {
      return storage.tournaments[tournamentId]?.savedMatches?.[matchNumber];
    },
    [storage]
  );

  const getAllSavedMatches = useCallback(
    (tournamentId: string): Record<number, SavedMatch> | undefined => {
      return storage.tournaments[tournamentId]?.savedMatches;
    },
    [storage]
  );

  const saveMatch = useCallback(
    (match: SavedMatch) => {
      const tid = match.tournamentId;
      commitStorageUpdate((prev) => {
        const existing = prev.tournaments[tid];
        const existingMatches = { ...(existing?.savedMatches || {}) };
        existingMatches[match.matchNumber] = match;

        const maxMatchNum = Math.max(
          existing?.tournament.completedMatches || 0,
          ...Object.keys(existingMatches).map(Number)
        );

        const targetTournament =
          existing?.tournament || {
            id: tid,
            name: 'Tournament',
            subtitle: '',
            organizer: '',
            date: new Date().toISOString().split('T')[0],
            teamCount: 12,
            playersPerTeam: 4,
            matchCount: Math.max(3, maxMatchNum),
            completedMatches: maxMatchNum,
            status: 'in_progress',
            lastUpdated: 'Just now',
            game: 'Free Fire',
            scoring: DEFAULT_SCORING,
            tableSettings: DEFAULT_TABLE_SETTINGS,
          };

        const completedMatchesCount = Object.keys(existingMatches).filter(
          (k) => existingMatches[Number(k)]?.results?.length > 0
        ).length;

        const updatedTournament: TournamentConfig = {
          ...targetTournament,
          completedMatches: completedMatchesCount,
          lastUpdated: 'Just now',
          status: completedMatchesCount >= targetTournament.matchCount ? 'completed' : 'in_progress',
        };

        const updatedRecord: StoredTournamentRecord = {
          ...(existing || { tournament: updatedTournament }),
          tournament: updatedTournament,
          savedMatches: existingMatches,
        };

        return {
          ...prev,
          tournaments: {
            ...prev.tournaments,
            [tid]: updatedRecord,
          },
        };
      });
    },
    [commitStorageUpdate]
  );

  const getMatchesForTournament = useCallback(
    (id: string): MatchSummary[] => {
      const tournament = storage.tournaments[id]?.tournament;
      if (!tournament) return [];

      const maps = ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'NexTerra'];
      const count = tournament.matchCount || 3;
      const tourneySaved = storage.tournaments[id]?.savedMatches || {};

      const matches: MatchSummary[] = [];
      for (let i = 1; i <= count; i++) {
        const saved = tourneySaved[i];
        if (saved && saved.results && saved.results.length > 0) {
          const winner = saved.results.find((r) => r.placement === 1)?.teamName || 'Slot 1';
          matches.push({
            matchNumber: i,
            mapName: saved.mapName || maps[(i - 1) % maps.length],
            status: 'completed',
            winnerTeam: winner,
            totalKills: saved.totalKills,
            completedAt: new Date(saved.savedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          });
        } else {
          matches.push({
            matchNumber: i,
            mapName: maps[(i - 1) % maps.length],
            status: 'pending',
            winnerTeam: 'TBD',
            totalKills: 0,
          });
        }
      }
      return matches;
    },
    [storage]
  );

  const getStandingsForTournament = useCallback(
    (id: string): TeamStanding[] => {
      const tournament = storage.tournaments[id]?.tournament;
      if (!tournament) return [];

      const slots = getSlotsForTournament(id);
      const tourneySaved = storage.tournaments[id]?.savedMatches;

      return calculateTournamentStandings(tournament, slots, tourneySaved);
    },
    [storage, getSlotsForTournament]
  );

  const getTournamentDesign = useCallback(
    (tournamentId: string): PointsTableDesignConfig => {
      const existing = storage.tournaments[tournamentId]?.design;
      if (existing) {
        // Visual refresh migration: preserve tournament content and settings while
        // moving every older design to the final clean white/orange/yellow sheet.
        if ((existing.visualVersion || 0) < 4) {
          const refreshed = {
            ...existing,
            showBooyahs: existing.showBooyahs ?? true,
            showMatchPoints: true,
            showPlacementPoints: true,
            showKillPoints: false,
            showTotalPoints: true,
            showPodium: false,
            theme: 'gold' as PointsTableDesignConfig['theme'],
            typography: 'large' as PointsTableDesignConfig['typography'],
            tableStyle: 'broadcast' as PointsTableDesignConfig['tableStyle'],
            visualVersion: 4,
          };
          return refreshed;
        }
        return existing;
      }
      const tournament = storage.tournaments[tournamentId]?.tournament;
      return createDefaultDesignConfig(
        tournament?.name,
        tournament?.organizer,
        tournament?.matchCount
      );
    },
    [storage]
  );

  const saveTournamentDesign = useCallback(
    (tournamentId: string, config: PointsTableDesignConfig) => {
      commitStorageUpdate((prev) => {
        const existing = prev.tournaments[tournamentId];
        if (!existing) return prev;

        return {
          ...prev,
          tournaments: {
            ...prev.tournaments,
            [tournamentId]: {
              ...existing,
              design: config,
            },
          },
        };
      });
    },
    [commitStorageUpdate]
  );

  const deleteTournament = useCallback(
    (id: string) => {
      commitStorageUpdate((prev) => {
        const nextTournaments = { ...prev.tournaments };
        delete nextTournaments[id];
        return {
          ...prev,
          tournaments: nextTournaments,
        };
      });
    },
    [commitStorageUpdate]
  );

  const duplicateTournament = useCallback(
    (id: string, options?: DuplicateTournamentOptions): string => {
      const existing = storage.tournaments[id];
      if (!existing) throw new Error(`Tournament ${id} not found.`);

      const opts = { copySlotList: true, copySavedMatches: false, copyDesign: true, ...(options || {}) };
      const slug = (existing.tournament.name || 'tournament').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'tournament';
      const newTournamentId = `t-${slug}-copy-${Date.now().toString(36)}`;
      const newTournament: TournamentConfig = JSON.parse(JSON.stringify(existing.tournament));
      newTournament.id = newTournamentId;
      newTournament.name = opts.customName?.trim() || `${existing.tournament.name} (Copy)`;
      newTournament.lastUpdated = 'Just now';
      newTournament.completedMatches = 0;
      newTournament.status = 'in_progress';

      const newSlotList = opts.copySlotList && existing.slotList
        ? { ...JSON.parse(JSON.stringify(existing.slotList)), tournamentId: newTournamentId }
        : undefined;
      const newSavedMatches: Record<number, SavedMatch> = {};
      if (opts.copySavedMatches && existing.savedMatches) {
        Object.entries(JSON.parse(JSON.stringify(existing.savedMatches))).forEach(([key, match]) => {
          newSavedMatches[Number(key)] = { ...(match as SavedMatch), tournamentId: newTournamentId };
        });
        const count = Object.keys(newSavedMatches).length;
        newTournament.completedMatches = count;
        newTournament.status = count >= newTournament.matchCount ? 'completed' : 'in_progress';
      }

      const newDesign = opts.copyDesign && existing.design
        ? { ...JSON.parse(JSON.stringify(existing.design)), heading: newTournament.name.toUpperCase() }
        : createDefaultDesignConfig(newTournament.name, newTournament.organizer, newTournament.matchCount);

      const newRecord: StoredTournamentRecord = {
        tournament: newTournament,
        slotList: newSlotList,
        savedMatches: newSavedMatches,
        design: newDesign,
      };

      commitStorageUpdate((prev) => ({
        ...prev,
        tournaments: { [newTournamentId]: newRecord, ...prev.tournaments },
      }));
      return newTournamentId;
    },
    [storage, commitStorageUpdate]
  );

  const resetTournamentData = useCallback(
    (id: string) => {
      commitStorageUpdate((prev) => {
        const existing = prev.tournaments[id];
        if (!existing) return prev;

        return {
          ...prev,
          tournaments: {
            ...prev.tournaments,
            [id]: {
              ...existing,
              tournament: {
                ...existing.tournament,
                completedMatches: 0,
                status: 'in_progress',
                lastUpdated: 'Just now',
              },
              slotList: undefined,
              savedMatches: {},
            },
          },
        };
      });
    },
    [commitStorageUpdate]
  );

  const deleteSavedMatch = useCallback(
    (tournamentId: string, matchNumber: number) => {
      commitStorageUpdate((prev) => {
        const existing = prev.tournaments[tournamentId];
        if (!existing || !existing.savedMatches) return prev;

        const nextMatches = { ...existing.savedMatches };
        delete nextMatches[matchNumber];

        const remainingKeys = Object.keys(nextMatches).map(Number);
        const completedCount = remainingKeys.filter(
          (k) => nextMatches[k]?.results?.length > 0
        ).length;

        const updatedTournament: TournamentConfig = {
          ...existing.tournament,
          completedMatches: completedCount,
          status: completedCount >= existing.tournament.matchCount ? 'completed' : 'in_progress',
          lastUpdated: 'Just now',
        };

        return {
          ...prev,
          tournaments: {
            ...prev.tournaments,
            [tournamentId]: {
              ...existing,
              tournament: updatedTournament,
              savedMatches: nextMatches,
            },
          },
        };
      });
    },
    [commitStorageUpdate]
  );

  const resetSlotList = useCallback(
    (tournamentId: string) => {
      commitStorageUpdate((prev) => {
        const existing = prev.tournaments[tournamentId];
        if (!existing) return prev;

        return {
          ...prev,
          tournaments: {
            ...prev.tournaments,
            [tournamentId]: {
              ...existing,
              slotList: undefined,
              tournament: {
                ...existing.tournament,
                lastUpdated: 'Just now',
              },
            },
          },
        };
      });
    },
    [commitStorageUpdate]
  );

  return (
    <TournamentContext.Provider
      value={{
        tournaments,
        createTournament,
        updateTournament,
        deleteTournament,
        duplicateTournament,
        resetTournamentData,
        getTournament,
        getSlotsForTournament,
        getMatchesForTournament,
        getStandingsForTournament,
        getSlotList,
        saveSlotList,
        updateSlotList,
        resetSlotList,
        getSavedMatch,
        getAllSavedMatches,
        saveMatch,
        deleteSavedMatch,
        getTournamentDesign,
        saveTournamentDesign,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournaments = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournaments must be used within a TournamentProvider');
  }
  return context;
};
