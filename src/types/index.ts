export type TournamentStatus = 'in_progress' | 'completed' | 'upcoming' | 'draft';

export interface ScoringConfig {
  preset: 'Free Fire Standard' | 'Custom';
  placementPoints: Record<number, number>;
  pointsPerKill: number;
}

export interface TableSettingsConfig {
  showKills: boolean;
  showPlacement: boolean;
  showMatchPoints: boolean;
  showTotalPoints: boolean;
  heading: string;
  subtitle: string;
  organizer: string;
}

export interface PointsTableDesignConfig {
  heading: string;
  subtitle: string;
  organizer: string;
  showOrganizer: boolean;
  showDate: boolean;
  customDate?: string;

  showRank: boolean;
  showTeam: boolean;
  showBooyahs?: boolean;
  showMatchPoints: boolean;
  visibleMatches?: Record<number, boolean>; // e.g., { 1: true, 2: true, 3: true }
  showKills: boolean;
  showPlacementPoints: boolean;
  showKillPoints: boolean;
  showTotalPoints: boolean;

  showPodium: boolean;
  showWatermark?: boolean;

  teamDisplay: 'all' | 'top10' | 'top12' | 'top16' | 'custom';
  customTeamCount?: number;

  format: '4:5' | '9:16' | '16:9';
  theme: 'gold' | 'cyan' | 'crimson' | 'green' | 'midnight';
  typography: 'compact' | 'standard' | 'large';
  tableStyle: 'modern' | 'minimal' | 'broadcast';
  visualVersion?: number;
}

export interface Tournament {
  id: string;
  name: string;
  subtitle: string;
  organizer: string;
  date?: string;
  teamCount: number;
  playersPerTeam: number;
  matchCount: number;
  completedMatches: number;
  status: TournamentStatus;
  lastUpdated: string;
  game: string;
  bannerUrl?: string;
  publicId?: string;
  isPublished?: boolean;
  publishedAt?: string;
  scoring?: ScoringConfig;
  tableSettings?: TableSettingsConfig;
  designConfig?: PointsTableDesignConfig;
}

export type TournamentConfig = Tournament & {
  date: string;
  scoring: ScoringConfig;
  tableSettings: TableSettingsConfig;
  designConfig?: PointsTableDesignConfig;
};

export interface Player {
  id: string;
  name: string;
  role?: string;
  confidence?: 'high' | 'medium' | 'low';
  needsReview?: boolean;
}

export interface Slot {
  slotNumber: number;
  teamName?: string;
  teamTag?: string;
  players: Player[];
  status?: 'confirmed' | 'reserved' | 'empty';
  warning?: string;
}

// Backward compatibility alias for TeamSlot
export type TeamSlot = Slot;

export interface SlotList {
  tournamentId: string;
  slots: Slot[];
  sourceImages: string[];
  extractedAt?: string;
  isSaved?: boolean;
}

export interface MatchPlayerResult {
  playerName: string;
  kills: number | null;
  confidence?: 'high' | 'medium' | 'low';
  needsReview?: boolean;
  matchedSlotNumber?: number;
  matchStatus?: 'matched' | 'ambiguous' | 'unmatched';
}

export interface MatchSlotResult {
  placement: number;
  slotNumber?: number;
  teamName?: string;
  players: MatchPlayerResult[];
  totalKills: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
  status: 'valid' | 'warning' | 'needs_review';
  warningMessage?: string;
}

export interface MatchResult {
  tournamentId: string;
  matchNumber: number;
  results: MatchSlotResult[];
  sourceImages: string[];
  extractedAt?: string;
  isSaved?: boolean;
}

export interface SavedMatch {
  tournamentId: string;
  matchNumber: number;
  results: MatchSlotResult[];
  totalKills: number;
  savedAt: string;
  mapName?: string;
}

export interface MatchBreakdown {
  placement: number;
  kills: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
}

export interface TeamStanding {
  rank: number;
  slotNumber?: number;
  teamName: string;
  teamTag?: string;
  matchesPlayed: number;
  matchPoints?: Record<number, number | null>; // matchNumber -> points, or null if unplayed
  matchBreakdowns?: Record<number, MatchBreakdown>;
  placement?: string; // e.g. "#1" for highest rank or display
  placementPoints: number; // alias for totalPlacementPoints
  totalPlacementPoints?: number;
  kills: number; // alias for totalKills
  totalKills?: number;
  killPoints: number; // alias for totalKillPoints
  totalKillPoints?: number;
  totalPoints: number;
  booyahs: number; // wins in Free Fire (1st places)
  diff?: number;
  isTied?: boolean;
}

export interface PlayerStanding {
  playerName: string;
  teamName: string;
  slotNumber?: number;
  matchesPlayed: number;
  kills: number;
  killPoints: number;
  totalPoints: number;
  isMvp?: boolean;
}

export interface MatchSummary {
  matchNumber: number;
  mapName: string;
  status: 'completed' | 'in_progress' | 'pending';
  winnerTeam: string;
  totalKills: number;
  completedAt?: string;
}
