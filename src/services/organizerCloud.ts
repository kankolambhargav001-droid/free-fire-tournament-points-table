/**
 * Private organizer data persistence.
 *
 * Firestore is the preferred source of truth. A user-scoped local cache is kept
 * as a durable fallback so a temporary Firestore permission/network problem
 * never makes an organizer's already-saved tournament appear empty after a
 * browser refresh.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { UnifiedTournamentStorage, StoredTournamentRecord } from '../utils/tournamentStorage';

const ORGANIZER_COLLECTION = 'organizers';
const TOURNAMENTS_SUBCOLLECTION = 'tournaments';
const LOCAL_CACHE_PREFIX = 'tp_organizer_storage_v2_';

function localCacheKey(uid: string): string {
  return `${LOCAL_CACHE_PREFIX}${uid}`;
}

function emptyStorage(): UnifiedTournamentStorage {
  return { version: 1, tournaments: {} };
}

function readLocalStorage(uid: string): UnifiedTournamentStorage {
  if (typeof localStorage === 'undefined') return emptyStorage();

  try {
    const raw = localStorage.getItem(localCacheKey(uid));
    if (!raw) return emptyStorage();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.tournaments !== 'object') {
      return emptyStorage();
    }
    return {
      version: 1,
      tournaments: parsed.tournaments || {},
    };
  } catch (error) {
    console.warn('Unable to read organizer local cache:', error);
    return emptyStorage();
  }
}

function writeLocalStorage(uid: string, storage: UnifiedTournamentStorage): void {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(localCacheKey(uid), JSON.stringify(storage));
  } catch (error) {
    // Storage quota errors should never break tournament editing.
    console.warn('Unable to write organizer local cache:', error);
  }
}

function cleanRecord(record: StoredTournamentRecord): StoredTournamentRecord {
  // Uploaded screenshot base64 data is deliberately not stored in Firestore.
  // The extracted slot/match data is the durable data we need.
  const slotList = record.slotList
    ? {
        ...record.slotList,
        sourceImages: [],
      }
    : undefined;

  return JSON.parse(
    JSON.stringify({
      ...record,
      slotList,
    })
  );
}

function tournamentRef(uid: string, tournamentId: string) {
  return doc(db, ORGANIZER_COLLECTION, uid, TOURNAMENTS_SUBCOLLECTION, tournamentId);
}

export async function loadOrganizerStorage(uid: string): Promise<UnifiedTournamentStorage> {
  const cached = readLocalStorage(uid);

  try {
    const snapshot = await getDocs(
      collection(db, ORGANIZER_COLLECTION, uid, TOURNAMENTS_SUBCOLLECTION)
    );
    const tournaments: UnifiedTournamentStorage['tournaments'] = {};

    snapshot.forEach((item) => {
      const data = item.data();
      if (data?.tournament?.id) {
        tournaments[item.id] = data as StoredTournamentRecord;
      }
    });

    const cloudStorage: UnifiedTournamentStorage = { version: 1, tournaments };

    // If Firestore is reachable and has data, it wins and refreshes the cache.
    if (Object.keys(tournaments).length > 0) {
      writeLocalStorage(uid, cloudStorage);
      return cloudStorage;
    }

    // Empty cloud + existing local data: preserve the organizer's local work.
    // This also protects against an incorrectly deployed Firestore ruleset.
    if (Object.keys(cached.tournaments).length > 0) {
      return cached;
    }

    writeLocalStorage(uid, cloudStorage);
    return cloudStorage;
  } catch (error) {
    console.warn('Firestore tournament load failed; using organizer local cache.', error);
    return cached;
  }
}

export async function saveOrganizerTournament(
  uid: string,
  tournamentId: string,
  record: StoredTournamentRecord
): Promise<void> {
  await setDoc(
    tournamentRef(uid, tournamentId),
    {
      ...cleanRecord(record),
      ownerUid: uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteOrganizerTournament(uid: string, tournamentId: string): Promise<void> {
  await deleteDoc(tournamentRef(uid, tournamentId));
}

export async function syncOrganizerStorage(
  uid: string,
  previous: UnifiedTournamentStorage,
  next: UnifiedTournamentStorage
): Promise<void> {
  // Persist locally FIRST. This guarantees that a Firestore outage never
  // destroys the user's current work or makes it disappear on refresh.
  writeLocalStorage(uid, next);

  const previousIds = new Set(Object.keys(previous.tournaments));
  const nextIds = new Set(Object.keys(next.tournaments));

  try {
    await Promise.all(
      Object.entries(next.tournaments).map(([id, record]) =>
        saveOrganizerTournament(uid, id, record)
      )
    );

    await Promise.all(
      [...previousIds]
        .filter((id) => !nextIds.has(id))
        .map((id) => deleteOrganizerTournament(uid, id))
    );
  } catch (error) {
    // Keep the local cache. Re-throw so the existing UI error logging remains
    // useful, but never remove the cached data.
    throw error;
  }
}
