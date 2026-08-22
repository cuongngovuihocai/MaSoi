export type Team = 'villagers' | 'werewolves' | 'neutral';

export type RoleType =
  | 'villager'
  | 'werewolf'
  | 'seer'
  | 'guard'
  | 'witch'
  | 'hunter'
  | 'elder'
  | 'cupid'
  | 'fox'
  | 'piper'
  | 'white_wolf'
  | 'curse_wolf'
  | 'dire_wolf'
  | 'idiot'
  | 'angel'
  | 'scapegoat'
  | 'stuttering_judge'
  | 'wild_child'
  | 'wolf_man';

export type GamePhase =
  | 'lobby'
  | 'night'
  | 'day_announcement'
  | 'day_discussion'
  | 'day_voting'
  | 'day_defense'
  | 'day_verdict'
  | 'ended';

export type NightStep =
  | 'cupid'
  | 'wild_child'
  | 'werewolves'
  | 'curse_wolf'
  | 'dire_wolf'
  | 'white_wolf'
  | 'guard'
  | 'seer'
  | 'witch'
  | 'fox'
  | 'piper'
  | 'done';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isAlive: boolean;
  role: RoleType;
  team: Team;
  loverId?: string | null;
  charmedByPiper?: boolean;
  isProtected?: boolean;
  isWolfTransformed?: boolean;
  roleRevealed?: boolean;
  isBot?: boolean;
  deathReason?: string;
  deathTiming?: string;
  fosterParentId?: string; // For Wild Child / Đứa trẻ hoang dã
  idiotSaved?: boolean; // For Idiot / Thằng ngốc
  witchHealUsed?: boolean;
  witchPoisonUsed?: boolean;
  curseUsed?: boolean;
  foxLostPower?: boolean;
  stutteringJudgeUsed?: boolean;
  elderExtraLifeUsed?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
}

export interface RoomConfig {
  discussionTimeSeconds: number;
  votingTimeSeconds: number;
  defenseTimeSeconds: number;
  narratorEnabled: boolean;
  voiceChatEnabled: boolean;
}

export interface Room {
  id: string;
  hostId: string;
  hostName: string;
  status: GamePhase;
  dayNumber: number;
  phaseEndTime: number;
  nightStep: NightStep;
  nightStepEndTime: number;
  winner?: Team | 'lovers' | 'piper' | 'angel' | 'white_wolf' | null;
  rolesList: RoleType[];
  assignedRoles?: Record<string, RoleType>;
  accusedPlayerId?: string | null;
  verdictFinished?: boolean;
  verdictResultText?: string | null;
  narratorText?: string;
  lastNightVictimIds?: string[];
  pendingHunterShot?: {
    hunterId: string;
    hunterName: string;
    reason: string;
    dayNumber?: number;
  } | null;
  stutteringJudgeSignActive?: boolean;
  judgeSecondVotingActive?: boolean;
  villagePowersLost?: boolean;
  newWolfAppearedDay?: number;
  config: RoomConfig;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  content: string;
  channel: 'global' | 'werewolf' | 'ghost';
  type: 'text' | 'voice' | 'system' | 'narrator';
  audioDataUri?: string | null;
  createdAt: number;
}

export interface VoteRecord {
  voterId: string;
  targetId: string;
  type: 'nominate' | 'guilty' | 'innocent' | 'verdict' | 'early_vote_ready' | 'tally_ready' | 'verdict_tally_ready';
}

export interface NightActionRecord {
  id?: string;
  actorId: string;
  actorRole: RoleType;
  targetId?: string;
  targetIds?: string[];
  actionType: string;
  dayNumber: number;
  isRefunded?: boolean;
}

export interface RoleMeta {
  id: RoleType;
  name: string;
  team: Team;
  teamName: string;
  description: string;
  ability: string;
  nightPriority: number; // Order in night phase
  iconName: string;
  badgeColor: string;
  quote: string;
}
