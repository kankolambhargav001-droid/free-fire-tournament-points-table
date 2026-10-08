/**
 * Tournament Cloud Persistence Service
 * Handles uploading and reading published tournament snapshots in Firestore.
 */

import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, isFirebaseConfigured } from './firebase';
import {
  TournamentConfig,
  SlotList,
  SavedMatch,
  PointsTableDesignConfig,
  TeamStanding,
  ScoringConfig,
} from '../types';

export interface PublishedTournamentRecord {
  publicId: string;
  tournamentId: string;
  name: string;
  subtitle: string;
  organizer: string;
  date: string;
  game?: string;
  teamCount: number;
  playersPerTeam: number;
  matchCount: number;
  completedMatches: number;
  scoring: ScoringConfig;
  slotList?: SlotList;
  savedMatches?: Record<number, SavedMatch>;
  design: PointsTableDesignConfig;
  standings: TeamStanding[];
  published: boolean;
  publisherUid: string;
  publisherEmail?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Generates an 8-character stable alphanumeric public ID.
 * Example: tp7K9xQ2
 */
export function generatePublicTournamentId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  let result = 'tp';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validates tournament before cloud publishing.
 */
export function validateTournamentForPublish(
  tournament: TournamentConfig,
  standings: TeamStanding[]
): { valid: boolean; reason?: string } {
  if (!tournament) {
    return { valid: false, reason: 'Tournament data is missing.' };
  }
  if (!tournament.name || tournament.name.trim().length === 0) {
    return { valid: false, reason: 'Tournament name is required to publish.' };
  }
  if (tournament.teamCount <= 0) {
    return { valid: false, reason: 'Tournament must have at least 1 team configured.' };
  }
  if (!standings || !Array.isArray(standings)) {
    return { valid: false, reason: 'Standings calculation is unavailable.' };
  }
  return { valid: true };
}

/**
 * Publishes or updates a tournament in Firestore.
 * Preserves existing publicId if previously published.
 */
export async function publishTournamentToCloud(params: {
  tournament: TournamentConfig;
  slotList: SlotList;
  savedMatches: Record<number, SavedMatch>;
  design: PointsTableDesignConfig;
  standings: TeamStanding[];
  existingPublicId?: string;
}): Promise<{ publicId: string; publicUrl: string }> {
  if (!isFirebaseConfigured()) {
    throw new Error('Cloud publishing is not configured yet.');
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please sign in with Google to publish or update tournament results.');
  }

  const { tournament, slotList, savedMatches, design, standings, existingPublicId } = params;

  const validation = validateTournamentForPublish(tournament, standings);
  if (!validation.valid) {
    throw new Error(validation.reason || 'Unable to publish this tournament. Please review tournament data.');
  }

  // Use existing publicId or generate new stable one
  const publicId = existingPublicId || tournament.publicId || generatePublicTournamentId();
  const docPath = `tournaments/${publicId}`;

  const nowIso = new Date().toISOString();

  // Clean slotList and savedMatches for Firestore JSON safety
  const safeSlotList: SlotList = {
    tournamentId: tournament.id,
    slots: slotList?.slots || [],
    sourceImages: [], // Don't upload massive screenshot base64 strings to public snapshot
    extractedAt: slotList?.extractedAt || nowIso,
  };

  const safeMatches: Record<number, SavedMatch> = {};
  if (savedMatches) {
    Object.entries(savedMatches).forEach(([mKey, mVal]) => {
      safeMatches[Number(mKey)] = {
        tournamentId: tournament.id,
        matchNumber: mVal.matchNumber,
        results: mVal.results || [],
        totalKills: mVal.totalKills || 0,
        savedAt: mVal.savedAt || nowIso,
        mapName: mVal.mapName || `Match ${mVal.matchNumber}`,
      };
    });
  }

  const rawPayload: PublishedTournamentRecord = {
    publicId,
    tournamentId: tournament.id,
    name: tournament.name.trim(),
    subtitle: tournament.subtitle || '',
    organizer: tournament.organizer || '',
    date: tournament.date || nowIso.split('T')[0],
    game: tournament.game || 'Free Fire',
    teamCount: tournament.teamCount,
    playersPerTeam: tournament.playersPerTeam || 4,
    matchCount: tournament.matchCount || 3,
    completedMatches: tournament.completedMatches || 0,
    scoring: tournament.scoring,
    slotList: safeSlotList,
    savedMatches: safeMatches,
    design,
    standings,
    published: true,
    publisherUid: currentUser.uid,
    ...(currentUser.email ? { publisherEmail: currentUser.email } : {}),
    createdAt: tournament.publishedAt || nowIso,
    updatedAt: nowIso,
  };

  // Strip any undefined or non-serializable fields before writing to Firestore
  const payload: PublishedTournamentRecord = JSON.parse(JSON.stringify(rawPayload));

  try {
    const docRef = doc(db, 'tournaments', publicId);
    await setDoc(docRef, payload, { merge: true });

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const publicUrl = `${origin}/results/${publicId}`;

    return { publicId, publicUrl };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Sanitizes and fills defaults for a published tournament record.
 * Protects against malformed or legacy documents.
 */
function sanitizePublishedTournament(data: any, publicId: string): PublishedTournamentRecord {
  return {
    publicId: data.publicId || publicId,
    tournamentId: data.tournamentId || 'tournament',
    name: (data.name && String(data.name).trim()) || 'Tournament Results',
    subtitle: data.subtitle || '',
    organizer: data.organizer || '',
    date: data.date || '',
    game: data.game || 'Free Fire',
    teamCount: Number(data.teamCount) || (Array.isArray(data.standings) ? data.standings.length : 12),
    playersPerTeam: Number(data.playersPerTeam) || 4,
    matchCount: Number(data.matchCount) || 3,
    completedMatches:
      Number(data.completedMatches) || (data.savedMatches ? Object.keys(data.savedMatches).length : 0),
    scoring: data.scoring || {
      preset: 'Free Fire Standard',
      placementPoints: {},
      pointsPerKill: 1,
    },
    slotList: data.slotList || {
      tournamentId: data.tournamentId || '',
      slots: [],
      sourceImages: [],
    },
    savedMatches: data.savedMatches || {},
    design: data.design || {
      heading: data.name || 'POINTS TABLE',
      subtitle: data.subtitle || 'OVERALL STANDINGS',
      organizer: data.organizer || '',
      showOrganizer: true,
      showDate: true,
      showRank: true,
      showTeam: true,
      showBooyahs: true,
      showMatchPoints: false,
      showKills: true,
      showPlacementPoints: false,
      showKillPoints: false,
      showTotalPoints: true,
      showPodium: false,
      showWatermark: true,
      teamDisplay: 'all',
      format: '4:5',
      theme: 'gold',
      typography: 'standard',
      tableStyle: 'broadcast',
      visualVersion: 4,
    },
    standings: Array.isArray(data.standings) ? data.standings : [],
    published: data.published === true,
    publisherUid: data.publisherUid || '',
    publisherEmail: data.publisherEmail,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

/**
 * Fetches a single published tournament snapshot by publicId for read-only public viewer.
 * Returns null if the document does not exist or is not published.
 * Throws on network, timeout, or permissions error.
 */
export async function getPublishedTournamentFromCloud(
  publicId: string
): Promise<PublishedTournamentRecord | null> {
  if (!publicId || publicId.trim().length === 0) {
    return null;
  }

  const cleanId = publicId.trim();
  const docRef = doc(db, 'tournaments', cleanId);

  // 10-second timeout guard to avoid hanging indefinitely if Firestore/network is unresponsive
  const fetchPromise = getDoc(docRef);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('Connection timed out. Please check your internet connection.')),
      10000
    )
  );

  const snapshot = await Promise.race([fetchPromise, timeoutPromise]);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  if (!data || data.published !== true) {
    return null;
  }

  return sanitizePublishedTournament(data, cleanId);
}

/**
 * Subscribes to live updates of a published tournament.
 */
export function subscribeToPublishedTournament(
  publicId: string,
  onData: (data: PublishedTournamentRecord | null) => void,
  onError?: (err: Error) => void
) {
  const cleanId = publicId.trim();
  const docRef = doc(db, 'tournaments', cleanId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const data = snap.data();
      if (!data || data.published !== true) {
        onData(null);
        return;
      }
      onData(sanitizePublishedTournament(data, cleanId));
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}
