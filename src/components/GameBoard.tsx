import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChatMessage,
  NightActionRecord,
  NightStep,
  Player,
  RoleType,
  Room,
  VoteRecord,
} from '../types';
import { ROLE_DEFINITIONS, NARRATOR_SCRIPTS, getUniqueBotNames } from '../data/roles';
import {
  batchJoinPlayers,
  batchUpdatePlayers,
  clearNightActionsAndVotes,
  deleteNightAction,
  leaveRoom,
  sendChatMessage,
  submitNightAction,
  submitVote,
  updatePlayerState,
  updateRoomState,
} from '../services/firebase';
import { narrator } from '../services/narratorEngine';
import { soundEffects } from '../services/audioSynthesizer';
import { CardArt } from './CardArt';
import { CardRevealModal } from './CardRevealModal';
import { StoryPreambleModal } from './StoryPreambleModal';
import { TextChatPanel } from './TextChatPanel';
import { VictoryModal } from './VictoryModal';
import {
  Moon,
  Sun,
  Shield,
  Eye,
  Sparkles,
  BookOpen,
  Target,
  Gavel,
  Volume2,
  Clock,
  Skull,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Play,
  User,
  Zap,
  Vote,
  ShieldAlert,
  Loader2,
  X,
  Bot,
  Megaphone,
  UserPlus,
  UserMinus,
  Plus,
  Trash2,
} from 'lucide-react';

const BOT_AVATARS = ['🧙‍♂️', '🧝‍♀️', '🧛‍♂️', '🐺', '🧟‍♂️', '👸', '🤴', '🧔', '👩‍🦰', '🧑‍🌾'];

interface GameBoardProps {
  room: Room;
  players: Player[];
  messages: ChatMessage[];
  votes: VoteRecord[];
  actions: NightActionRecord[];
  currentPlayer: Player;
  onLeaveRoom?: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  room,
  players,
  messages,
  votes,
  actions,
  currentPlayer,
  onLeaveRoom,
}) => {
  // Custom In-App Toast Notification (Replaces intrusive browser alert dialogs)
  const [toastNotification, setToastNotification] = useState<{
    text: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    id: number;
  } | null>(null);

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastNotification({ text, type, id: Date.now() });
    toastTimerRef.current = setTimeout(() => {
      setToastNotification(null);
    }, 4500);
  }, []);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [seerResult, setSeerResult] = useState<string | null>(null);
  const [witchHealChoice, setWitchHealChoice] = useState<boolean | null>(null);
  const [witchPoisonTargetId, setWitchPoisonTargetId] = useState<string | null>(null);
  const [narratorMessage, setNarratorMessage] = useState<string>('');
  const lastSpokenTextRef = useRef<string>('');

  const announceNarrator = useCallback(
    (text: string, soundEffect?: 'wind' | 'howl' | 'gavel' | 'rooster' | 'chime' | 'death' | 'victory') => {
      setNarratorMessage(text);
      if (lastSpokenTextRef.current !== text) {
        lastSpokenTextRef.current = text;
        narrator.speak(text, soundEffect);
      }
    },
    []
  );

  const [isStoryPreambleOpen, setIsStoryPreambleOpen] = useState(false);
  const [isCardRevealOpen, setIsCardRevealOpen] = useState(false);
  const [lastRevealedMatchId, setLastRevealedMatchId] = useState<string | null>(null);
  const [isPressingMyCard, setIsPressingMyCard] = useState(false);
  const [isEarlyVotingModalOpen, setIsEarlyVotingModalOpen] = useState(false);
  const [minPlayersModalOpen, setMinPlayersModalOpen] = useState(false);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState<number>(0);
  const [hasReminded9Min, setHasReminded9Min] = useState<boolean>(false);

  // Reset discussion state & flags on phase change
  useEffect(() => {
    if (room.status !== 'day_discussion') {
      setHasReminded9Min(false);
      setIsEarlyVotingModalOpen(false);
    }
  }, [room.status, room.dayNumber]);

  const isHost = room.hostId === currentPlayer.id;
  const isNight = room.status === 'night';
  const isAlive = currentPlayer.isAlive;

  // Ensure phaseEndTime exists when entering timed phases (discussion or defense)
  useEffect(() => {
    if (room.status === 'day_discussion') {
      const discussionMs = (room.config?.discussionTimeSeconds || 180) * 1000;
      if (!room.phaseEndTime || room.phaseEndTime <= Date.now()) {
        if (isHost) {
          updateRoomState(room.id, { phaseEndTime: Date.now() + discussionMs });
        }
      }
    } else if (room.status === 'day_defense') {
      if (!room.phaseEndTime || room.phaseEndTime <= Date.now()) {
        if (isHost) {
          updateRoomState(room.id, { phaseEndTime: Date.now() + 60000 });
        }
      }
    }
  }, [room.status, room.id, isHost, room.phaseEndTime, room.config?.discussionTimeSeconds]);

  // Phase Timer Engine (Active for Discussion and Defense phases)
  useEffect(() => {
    if (room.status !== 'day_discussion' && room.status !== 'day_defense') return;

    const tickTimer = () => {
      if (!room.phaseEndTime) {
        if (room.status === 'day_discussion') {
          const defaultSecs = room.config?.discussionTimeSeconds || 180;
          setPhaseTimeLeft(defaultSecs);
        } else if (room.status === 'day_defense') {
          setPhaseTimeLeft(60);
        }
        return;
      }

      const remaining = Math.max(0, Math.ceil((room.phaseEndTime - Date.now()) / 1000));
      setPhaseTimeLeft(remaining);

      // 1-minute remaining warning for discussion phase
      if (room.status === 'day_discussion' && remaining <= 60 && remaining > 0 && !hasReminded9Min) {
        setHasReminded9Min(true);
        const reminderMsg =
          'Thời gian thảo luận chỉ còn 1 phút, tất cả dân làng hãy nhanh chóng hoàn tất ý kiến để chuẩn bị bỏ phiếu!';
        setNarratorMessage(reminderMsg);
        narrator.speak(reminderMsg, 'gavel');
      }

      // Time up -> auto-transition by Host
      if (remaining <= 0 && isHost) {
        if (room.status === 'day_discussion') {
          updateRoomState(room.id, {
            status: 'day_voting',
            phaseEndTime: null,
          });
        } else if (room.status === 'day_defense') {
          updateRoomState(room.id, {
            status: 'day_verdict',
            phaseEndTime: null,
          });
        }
      }
    };

    tickTimer();
    const interval = setInterval(tickTimer, 1000);
    return () => clearInterval(interval);
  }, [
    room.status,
    room.phaseEndTime,
    hasReminded9Min,
    isHost,
    room.id,
    room.config?.discussionTimeSeconds,
  ]);

  // Check if current player is a werewolf
  const isCurrentPlayerWolf = useMemo(() => {
    return (
      currentPlayer.role.includes('wolf') ||
      currentPlayer.team === 'werewolves'
    );
  }, [currentPlayer.role, currentPlayer.team]);

  // Check Cupid-linked partner ID
  const cupidLinkedPartnerId = useMemo(() => {
    const cupidActions = actions.filter((a) => a.actionType === 'cupid_link');
    const linkedIds = cupidActions.map((a) => a.targetId).filter(Boolean);
    if (linkedIds.includes(currentPlayer.id)) {
      return linkedIds.find((id) => id !== currentPlayer.id) || null;
    }
    return null;
  }, [actions, currentPlayer.id]);

  // Witch potion single-use tracking across past nights (ignoring refunded potions)
  const hasUsedHealInPast = useMemo(() => {
    return actions.some(
      (a) => a.actionType === 'witch_heal' && a.targetId && a.dayNumber < room.dayNumber && !a.isRefunded
    );
  }, [actions, room.dayNumber]);

  const hasUsedPoisonInPast = useMemo(() => {
    return actions.some(
      (a) => a.actionType === 'witch_poison' && a.targetId && a.dayNumber < room.dayNumber
    );
  }, [actions, room.dayNumber]);

  // Curse Wolf tracking across past nights
  const hasUsedCurseWolfInPast = useMemo(() => {
    return actions.some(
      (a) => a.actionType === 'curse_wolf_curse' && a.targetId && a.dayNumber < room.dayNumber
    );
  }, [actions, room.dayNumber]);

  const tonightCurseAction = useMemo(() => {
    return actions.find(
      (a) => a.actionType === 'curse_wolf_curse' && a.dayNumber === room.dayNumber
    );
  }, [actions, room.dayNumber]);

  const isCurseActiveTonight = useMemo(() => {
    return !!(tonightCurseAction && tonightCurseAction.targetId);
  }, [tonightCurseAction]);

  // Piper enchanted targets tracking across past nights
  const pastEnchantedTargetIds = useMemo(() => {
    const piperActions = actions.filter((a) => a.actionType === 'piper_enchant' && a.dayNumber < room.dayNumber);
    const ids: string[] = [];
    piperActions.forEach((a) => {
      if (a.targetId) ids.push(a.targetId);
      if (a.targetIds) ids.push(...a.targetIds);
    });
    return Array.from(new Set(ids));
  }, [actions, room.dayNumber]);

  // Werewolf target candidate for current night (with tie detection)
  const tonightWolfStatus = useMemo(() => {
    const wolfBites = actions.filter((a) => a.actionType === 'wolf_bite' && a.dayNumber === room.dayNumber);
    if (wolfBites.length === 0) {
      return { victim: null, isTie: false, message: 'Chưa ai chọn (Nhấp chọn 1 Dân Làng bên dưới)' };
    }
    const biteCounts: Record<string, number> = {};
    wolfBites.forEach((wb) => {
      if (wb.targetId) {
        biteCounts[wb.targetId] = (biteCounts[wb.targetId] || 0) + 1;
      }
    });
    let maxBites = 0;
    Object.values(biteCounts).forEach((count) => {
      if (count > maxBites) maxBites = count;
    });

    const topTargetIds = Object.entries(biteCounts)
      .filter(([, count]) => count === maxBites)
      .map(([tId]) => tId);

    if (topTargetIds.length > 1) {
      const tiedNames = topTargetIds
        .map((id) => players.find((p) => p.id === id)?.name)
        .filter(Boolean)
        .join(', ');
      return {
        victim: null,
        isTie: true,
        message: `Tỉ lệ hòa nhau giữa (${tiedNames}) — Sẽ chọn ngẫu nhiên 1 trong các con mồi nếu chốt!`,
      };
    }

    const victim = topTargetIds.length === 1 ? players.find((p) => p.id === topTargetIds[0]) || null : null;
    return {
      victim,
      isTie: false,
      message: victim ? victim.name : 'Chưa thống nhất',
    };
  }, [actions, room.dayNumber, players]);

  const tonightWolfVictim = tonightWolfStatus.victim;
  const tonightWolfBitePlayer = tonightWolfVictim;

  // Witch active choices for current night
  const tonightHealAction = useMemo(() => {
    return actions.find(
      (a) => a.actionType === 'witch_heal' && a.dayNumber === room.dayNumber
    );
  }, [actions, room.dayNumber]);

  const isHealActiveTonight = useMemo(() => {
    return !!(tonightHealAction && tonightHealAction.targetId);
  }, [tonightHealAction]);

  const tonightPoisonAction = useMemo(() => {
    return actions.find(
      (a) => a.actionType === 'witch_poison' && a.dayNumber === room.dayNumber
    );
  }, [actions, room.dayNumber]);

  const tonightPoisonPlayer = useMemo(() => {
    if (!tonightPoisonAction || !tonightPoisonAction.targetId) return null;
    return players.find((p) => p.id === tonightPoisonAction.targetId) || null;
  }, [tonightPoisonAction, players]);

  // Handlers for Witch Potions
  const handleToggleWitchHeal = async () => {
    if (room.villagePowersLost) {
      showToast('Dân làng đã treo cổ Già Làng! Phù Thủy đã mất toàn bộ năng lực.');
      return;
    }
    if (hasUsedHealInPast) {
      showToast('Bạn đã sử dụng Bình Thuốc Cứu ở đêm trước rồi!');
      return;
    }

    if (isHealActiveTonight) {
      await submitNightAction(room.id, {
        actorId: currentPlayer.id,
        actorRole: currentPlayer.role,
        targetId: '',
        actionType: 'witch_heal',
        dayNumber: room.dayNumber,
      });
      showToast('Đã hủy sử dụng Bình Thuốc Cứu.');
    } else {
      await submitNightAction(room.id, {
        actorId: currentPlayer.id,
        actorRole: currentPlayer.role,
        targetId: 'auto_wolf_victim',
        actionType: 'witch_heal',
        dayNumber: room.dayNumber,
      });
      soundEffects.playChimeBell();
      showToast('Đã kích hoạt Bình Thuốc Cứu! Phép thuật sẽ tự động cứu nạn nhân bị Ma Sói cắn đêm nay.');
    }
  };

  const handleCancelWitchPoison = async () => {
    await submitNightAction(room.id, {
      actorId: currentPlayer.id,
      actorRole: currentPlayer.role,
      targetId: '',
      actionType: 'witch_poison',
      dayNumber: room.dayNumber,
    });
    showToast('Đã hủy sử dụng Bình Thuốc Độc.');
  };

  const handleToggleCurseWolf = async () => {
    if (hasUsedCurseWolfInPast) {
      showToast('Bạn đã sử dụng lời nguyền ở đêm trước rồi!');
      return;
    }
    if (!tonightWolfBitePlayer) {
      showToast('Đêm nay phe Ma Sói chưa thống nhất chọn con mồi nào để nguyền rủa!');
      return;
    }
    if (isCurseActiveTonight) {
      await submitNightAction(room.id, {
        actorId: currentPlayer.id,
        actorRole: currentPlayer.role,
        targetId: '',
        actionType: 'curse_wolf_curse',
        dayNumber: room.dayNumber,
      });
      showToast('Đã hủy lời nguyền.');
    } else {
      await submitNightAction(room.id, {
        actorId: currentPlayer.id,
        actorRole: currentPlayer.role,
        targetId: tonightWolfBitePlayer.id,
        actionType: 'curse_wolf_curse',
        dayNumber: room.dayNumber,
      });
      soundEffects.playHowl();
      showToast(`Đã kích hoạt Lời Nguyền! Nạn nhân ${tonightWolfBitePlayer.name} sẽ bị biến thành Ma Sói mới đêm nay!`);
    }
  };

  // Summary of all active roles in the current match (regardless of alive/dead)
  const rolesSummary = useMemo(() => {
    const roleStats: Record<string, { total: number; alive: number }> = {};

    // Get assigned roles list or compute from players
    const allRoles: RoleType[] =
      room.rolesList && room.rolesList.length > 0
        ? room.rolesList
        : players.map((p) => p.role).filter(Boolean);

    allRoles.forEach((role) => {
      if (!roleStats[role]) {
        roleStats[role] = { total: 0, alive: 0 };
      }
      roleStats[role].total += 1;
    });

    players.forEach((p) => {
      if (p.isAlive && p.role && roleStats[p.role]) {
        roleStats[p.role].alive += 1;
      }
    });

    return Object.entries(roleStats).map(([role, stats]) => ({
      role: role as RoleType,
      meta: ROLE_DEFINITIONS[role as RoleType] || ROLE_DEFINITIONS.villager,
      total: stats.total,
      alive: stats.alive,
    }));
  }, [room.rolesList, players]);

  // Auto-trigger story preamble and secret card reveal sequence when match starts
  useEffect(() => {
    if (room.status !== 'lobby' && room.status !== 'ended') {
      const matchKey = `${room.id}_day${room.dayNumber}_${currentPlayer.role}`;
      if (lastRevealedMatchId !== matchKey && room.dayNumber === 1) {
        setIsStoryPreambleOpen(true);
        setLastRevealedMatchId(matchKey);
      }
    }
  }, [room.status, room.dayNumber, currentPlayer.role, room.id]);

  // Helper to determine active night steps based on assigned roles in scenario (includes dead roles for secrecy)
  const getValidNightSteps = (dayNum: number, rolesList: RoleType[], playerList: Player[]): NightStep[] => {
    const steps: NightStep[] = [];
    const activeRoles = new Set<RoleType>(
      rolesList && rolesList.length > 0
        ? rolesList
        : playerList.map((p) => p.role).filter(Boolean)
    );

    // 1. Cupid (Night 1 only)
    if (dayNum === 1 && activeRoles.has('cupid') && !room.villagePowersLost) {
      steps.push('cupid');
    }

    // 2. Wild Child (Night 1 only)
    if (dayNum === 1 && activeRoles.has('wild_child') && !room.villagePowersLost) {
      steps.push('wild_child');
    }

    // 3. Werewolves (if any werewolf in scenario)
    const hasWolves = Array.from(activeRoles).some(
      (r) => r.includes('wolf') || ROLE_DEFINITIONS[r]?.team === 'werewolves'
    );
    if (hasWolves) {
      steps.push('werewolves');
    }

    // 3b. Curse Wolf (Sói Nguyền)
    if (activeRoles.has('curse_wolf')) {
      steps.push('curse_wolf');
    }

    // 3c. White Wolf (Sói Trắng) - wakes up solo on even nights (night 2, 4, 6...)
    if (dayNum >= 2 && dayNum % 2 === 0 && activeRoles.has('white_wolf')) {
      steps.push('white_wolf');
    }

    // 3d. Dire Wolf (Sói Hùm) - wakes up extra if alive and no wolf has died
    const hasDeadWolf = playerList.some(
      (p) => !p.isAlive && (p.team === 'werewolves' || p.role.includes('wolf'))
    );
    if (activeRoles.has('dire_wolf') && !hasDeadWolf) {
      steps.push('dire_wolf');
    }

    // 4. Guard (only if village powers not lost)
    if (activeRoles.has('guard') && !room.villagePowersLost) {
      steps.push('guard');
    }

    // 5. Seer (only if village powers not lost)
    if (activeRoles.has('seer') && !room.villagePowersLost) {
      steps.push('seer');
    }

    // 6. Witch (only if village powers not lost)
    if (activeRoles.has('witch') && !room.villagePowersLost) {
      steps.push('witch');
    }

    // 7. Fox (only if village powers not lost)
    if (activeRoles.has('fox') && !room.villagePowersLost) {
      steps.push('fox');
    }

    // 8. Piper (Neutral team)
    if (activeRoles.has('piper')) {
      steps.push('piper');
    }

    steps.push('done');
    return steps;
  };

  // Check if current player holds the role active for this night step
  const isMyActiveNightStep = useMemo(() => {
    if (room.status !== 'night') return false;
    const stepRoleMap: Record<string, (p: Player) => boolean> = {
      cupid: (p) => p.role === 'cupid',
      wild_child: (p) => p.role === 'wild_child',
      werewolves: (p) => p.team === 'werewolves' || p.role.includes('wolf'),
      curse_wolf: (p) => p.role === 'curse_wolf',
      white_wolf: (p) => p.role === 'white_wolf',
      dire_wolf: (p) => p.role === 'dire_wolf',
      guard: (p) => p.role === 'guard',
      seer: (p) => p.role === 'seer',
      witch: (p) => p.role === 'witch',
      fox: (p) => p.role === 'fox' && !p.foxLostPower,
      piper: (p) => p.role === 'piper',
    };
    const checkFn = stepRoleMap[room.nightStep];
    return checkFn ? Boolean(checkFn(currentPlayer)) : false;
  }, [room.status, room.nightStep, currentPlayer]);

  // Check if current player can advance the night step
  const canAdvanceNight = (() => {
    if (room.status !== 'night') return false;
    const hasBots = players.some((p) => p.isBot);

    // Step role matching
    const stepRoleMap: Record<string, (p: Player) => boolean> = {
      cupid: (p) => p.role === 'cupid',
      wild_child: (p) => p.role === 'wild_child',
      werewolves: (p) => p.team === 'werewolves' || p.role.includes('wolf'),
      curse_wolf: (p) => p.role === 'curse_wolf',
      white_wolf: (p) => p.role === 'white_wolf',
      dire_wolf: (p) => p.role === 'dire_wolf',
      guard: (p) => p.role === 'guard',
      seer: (p) => p.role === 'seer',
      witch: (p) => p.role === 'witch',
      fox: (p) => p.role === 'fox' && !p.foxLostPower,
      piper: (p) => p.role === 'piper',
    };

    const isRoleMatching = stepRoleMap[room.nightStep];

    // 1. In Multiplayer (or Bot mode), any player holding the active night role (whether ALIVE or DEAD) can advance
    if (isRoleMatching && isRoleMatching(currentPlayer)) {
      return true;
    }

    // 2. In Bot Mode: Any human player can advance so the game never stalls on bot roles
    if (hasBots && !currentPlayer.isBot) {
      return true;
    }

    // 3. Fallback: If no player in the room holds this role -> Any player can click Next
    const anyPlayerHoldsRole = players.some((p) => isRoleMatching && isRoleMatching(p));
    if (!anyPlayerHoldsRole) {
      return true;
    }

    return false;
  })();

  // Sync Narrator voice & text whenever phase or night step changes with a transition delay
  useEffect(() => {
    if (!room.config.narratorEnabled) return;
    if (isStoryPreambleOpen || isCardRevealOpen) return;

    // 1.2-second transition delay for scene changes between night - day - night
    const transitionTimer = setTimeout(() => {
      if (room.status === 'night') {
        const nightSteps = getValidNightSteps(room.dayNumber, room.rolesList, players);
        const isFirstNightStep = room.nightStep === nightSteps[0];
        const nightIntro = NARRATOR_SCRIPTS.getNightStart(room.dayNumber);

        let stepMsg = '';
        let soundEffect: 'wind' | 'howl' | 'chime' = 'chime';

        switch (room.nightStep) {
          case 'cupid':
            stepMsg = NARRATOR_SCRIPTS.getCupidCall(room.dayNumber);
            soundEffect = 'chime';
            break;
          case 'wild_child':
            stepMsg = NARRATOR_SCRIPTS.getWildChildCall(room.dayNumber);
            soundEffect = 'chime';
            break;
          case 'werewolves':
            stepMsg = NARRATOR_SCRIPTS.getWerewolvesCall(room.dayNumber);
            soundEffect = 'howl';
            break;
          case 'curse_wolf':
            stepMsg = NARRATOR_SCRIPTS.getCurseWolfCall(room.dayNumber);
            soundEffect = 'howl';
            break;
          case 'white_wolf':
            stepMsg = NARRATOR_SCRIPTS.getWhiteWolfCall(room.dayNumber);
            soundEffect = 'howl';
            break;
          case 'dire_wolf':
            stepMsg = NARRATOR_SCRIPTS.getDireWolfCall(room.dayNumber);
            soundEffect = 'howl';
            break;
          case 'guard':
            stepMsg = NARRATOR_SCRIPTS.getGuardCall(room.dayNumber);
            soundEffect = 'chime';
            break;
          case 'seer':
            stepMsg = NARRATOR_SCRIPTS.getSeerCall(room.dayNumber);
            soundEffect = 'chime';
            break;
          case 'witch':
            stepMsg = NARRATOR_SCRIPTS.getWitchCall(room.dayNumber);
            soundEffect = 'chime';
            break;
          case 'fox':
            stepMsg = NARRATOR_SCRIPTS.getFoxCall(room.dayNumber);
            soundEffect = 'chime';
            break;
          case 'piper':
            stepMsg = NARRATOR_SCRIPTS.getPiperCall(room.dayNumber);
            soundEffect = 'chime';
            break;
        }

        const fullText = isFirstNightStep ? `${nightIntro} ${stepMsg}`.trim() : stepMsg.trim();
        announceNarrator(fullText, soundEffect);
      } else if (room.status === 'day_announcement') {
        soundEffects.playRooster();
        let dayMsg = `Trời đã sáng. Hôm nay là ngày thứ ${room.dayNumber} rồi! Tất cả dân làng hãy thức dậy... `;
        const hasDeaths = room.lastNightVictimIds && room.lastNightVictimIds.length > 0;
        if (hasDeaths) {
          const count = room.lastNightVictimIds?.length || 1;
          const victimPlayerNames = players
            .filter((p) => room.lastNightVictimIds?.includes(p.id))
            .map((p) => p.name);

          const formatNameList = (names: string[]) => {
            if (names.length === 0) return '';
            if (names.length === 1) return names[0];
            if (names.length === 2) return `${names[0]} và ${names[1]}`;
            return `${names.slice(0, -1).join(', ')} và ${names[names.length - 1]}`;
          };

          const victimNames = formatNameList(victimPlayerNames);
          dayMsg += NARRATOR_SCRIPTS.victimAnnounce(victimNames, count);
        } else {
          dayMsg += NARRATOR_SCRIPTS.noDeaths;
        }

        const newWolfAppeared =
          room.newWolfAppearedDay === room.dayNumber ||
          actions.some((a) => a.dayNumber === room.dayNumber && a.actionType === 'curse_wolf_curse' && a.targetId);

        if (newWolfAppeared) {
          dayMsg += ` ⚠️ Đêm qua đã xuất hiện thêm 1 con Sói mới gia nhập thế lực bóng đêm trong làng!`;
        }

        announceNarrator(dayMsg, newWolfAppeared ? 'howl' : hasDeaths ? 'death' : 'rooster');
      } else if (room.status === 'day_discussion') {
        if (!lastSpokenTextRef.current.includes('Không ai bị nhận đủ số phiếu bầu')) {
          const discMinutes = Math.round((room.config?.discussionTimeSeconds || 180) / 60);
          const promptText = typeof NARRATOR_SCRIPTS.discussionPrompt === 'function'
            ? NARRATOR_SCRIPTS.discussionPrompt(discMinutes)
            : NARRATOR_SCRIPTS.discussionPrompt;
          announceNarrator(promptText);
        }
      } else if (room.status === 'day_voting') {
        announceNarrator(NARRATOR_SCRIPTS.votingPrompt, 'gavel');
      } else if (room.status === 'day_defense' && room.accusedPlayerId) {
        const accused = players.find((p) => p.id === room.accusedPlayerId);
        if (accused) {
          const aliveCount = players.filter((p) => p.isAlive).length;
          const accusedVotes = votes.filter((v) => v.type === 'nominate' && v.targetId === accused.id).length;
          const txt = `Kết quả bình chọn: ${accused.name} nhận số phiếu nghi ngờ cao nhất (${accusedVotes}/${aliveCount} phiếu). Bị cáo có 1 phút để tự bào chữa!`;
          announceNarrator(txt, 'gavel');
        }
      } else if (room.status === 'day_verdict') {
        const accused = players.find((p) => p.id === room.accusedPlayerId);
        const verdictMsg = accused
          ? `BẮT ĐẦU PHÁN QUYẾT: Dân Làng hãy bỏ phiếu TREO CỔ hoặc THA BỔNG cho ${accused.name}!`
          : NARRATOR_SCRIPTS.verdictPrompt;
        announceNarrator(verdictMsg, 'gavel');
      }
    }, 1200);

    return () => clearTimeout(transitionTimer);
  }, [room.status, room.nightStep, room.dayNumber, room.accusedPlayerId, room.config.narratorEnabled, isStoryPreambleOpen, isCardRevealOpen, announceNarrator]);

  // Host Automated Phase Controller & Bot Action Executor
  useEffect(() => {
    if (!isHost) return;

    // Check Win Condition periodically
    const alivePlayers = players.filter((p) => p.isAlive);
    const aliveWolves = alivePlayers.filter((p) => {
      const rMeta = ROLE_DEFINITIONS[p.role as RoleType];
      return p.team === 'werewolves' || (rMeta && rMeta.team === 'werewolves');
    });
    const aliveNonWolves = alivePlayers.filter(
      (p) => !aliveWolves.some((w) => w.id === p.id)
    );

    if (
      room.status !== 'lobby' &&
      room.status !== 'ended' &&
      room.status !== 'night' &&
      room.status !== 'day_announcement' &&
      room.status !== 'day_defense' &&
      room.status !== 'day_verdict'
    ) {
      // Do not end game or trigger win condition while Hunter is choosing target
      if (room.pendingHunterShot) {
        const hunterP = players.find((p) => p.id === room.pendingHunterShot?.hunterId);
        if (hunterP?.isBot) {
          const aliveTargets = players.filter((p) => p.isAlive && p.id !== hunterP.id);
          if (aliveTargets.length > 0) {
            const t = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
            handleHunterShoot(t.id);
          } else {
            updateRoomState(room.id, { pendingHunterShot: null });
          }
        }
        return;
      }

      // 1. Check Piper (Người Thổi Sáo) Win Condition
      const alivePiper = alivePlayers.find((p) => p.role === 'piper');
      if (alivePiper) {
        const otherAlive = alivePlayers.filter((p) => p.id !== alivePiper.id);
        const enchantedIds = new Set<string>();
        actions.forEach((a) => {
          if (a.actionType === 'piper_enchant') {
            if (a.targetId) enchantedIds.add(a.targetId);
            if (a.targetIds && Array.isArray(a.targetIds)) a.targetIds.forEach((id) => enchantedIds.add(id));
          }
        });
        if (otherAlive.length === 0 || (otherAlive.length > 0 && otherAlive.every((p) => enchantedIds.has(p.id)))) {
          updateRoomState(room.id, { status: 'ended', winner: 'piper' });
          announceNarrator(NARRATOR_SCRIPTS.victoryAnnounce('Người Thổi Sáo đã thôi miên toàn bộ người còn sống và giành chiến thắng ngoạn mục!'), 'victory');
          return;
        }
      }

      // 2. Check Lovers (Cặp Đôi Tình Yêu) Win Condition
      if (alivePlayers.length === 2) {
        const loverIds = new Set<string>();
        const cupidActions = actions.filter((a) => a.actionType === 'cupid_link');
        cupidActions.forEach((a) => {
          if (a.targetId) loverIds.add(a.targetId);
          if (a.targetIds && Array.isArray(a.targetIds)) a.targetIds.forEach((id) => loverIds.add(id));
        });
        players.forEach((p) => {
          if (p.loverId) loverIds.add(p.id);
        });
        if (loverIds.size > 0 && alivePlayers.every((p) => loverIds.has(p.id))) {
          updateRoomState(room.id, { status: 'ended', winner: 'lovers' });
          announceNarrator(NARRATOR_SCRIPTS.victoryAnnounce('Cặp đôi tình yêu đã cùng nhau vượt qua mọi hiểm nguy và giành chiến thắng chung cuộc!'), 'victory');
          return;
        }
      }

      if (aliveWolves.length === 0) {
        updateRoomState(room.id, { status: 'ended', winner: 'villagers' });
        announceNarrator(NARRATOR_SCRIPTS.victoryAnnounce('Phe Dân Làng đã tiêu diệt hết Ma Sói và chiến thắng!'), 'victory');
        return;
      } else if (aliveWolves.length === 1 && aliveWolves[0].role === 'white_wolf' && aliveWolves.length >= aliveNonWolves.length) {
        updateRoomState(room.id, { status: 'ended', winner: 'white_wolf' });
        announceNarrator(NARRATOR_SCRIPTS.victoryAnnounce('Sói Trắng đã tiêu diệt hết đồng loại lẫn Dân Làng và chiến thắng đơn độc!'), 'howl');
        return;
      } else if (aliveWolves.length >= aliveNonWolves.length && aliveNonWolves.length > 0) {
        updateRoomState(room.id, { status: 'ended', winner: 'werewolves' });
        announceNarrator(NARRATOR_SCRIPTS.victoryAnnounce('Phe Ma Sói áp đảo số lượng và chiến thắng!'), 'howl');
        return;
      }
    }

    // Auto-bot actions for current step & Night auto-progression for dead roles
    if (isNight) {
      const bots = alivePlayers.filter((p) => p.isBot);
      bots.forEach(async (bot) => {
        if (room.nightStep === 'werewolves' && (bot.team === 'werewolves' || bot.role.includes('wolf'))) {
          const hasVoted = actions.some(
            (a) => a.actorId === bot.id && a.actionType === 'wolf_bite' && a.dayNumber === room.dayNumber
          );
          if (!hasVoted) {
            const targets = aliveNonWolves;
            if (targets.length > 0) {
              const t = targets[Math.floor(Math.random() * targets.length)];
              submitNightAction(room.id, {
                actorId: bot.id,
                actorRole: bot.role,
                targetId: t.id,
                actionType: 'wolf_bite',
                dayNumber: room.dayNumber,
              });
            }
          }
        } else if (room.nightStep === 'cupid' && bot.role === 'cupid' && room.dayNumber === 1) {
          const hasActed = actions.some(
            (a) => a.actorId === bot.id && a.actionType === 'cupid_link' && a.dayNumber === 1
          );
          if (!hasActed) {
            const candidates = alivePlayers.filter((p) => p.id !== bot.id);
            if (candidates.length >= 2) {
              submitNightAction(room.id, {
                actorId: bot.id,
                actorRole: bot.role,
                targetId: candidates[0].id,
                actionType: 'cupid_link',
                dayNumber: 1,
              });
              submitNightAction(room.id, {
                actorId: bot.id,
                actorRole: bot.role,
                targetId: candidates[1].id,
                actionType: 'cupid_link',
                dayNumber: 1,
              });
            }
          }
        } else if (room.nightStep === 'wild_child' && bot.role === 'wild_child' && room.dayNumber === 1) {
          const hasActed = actions.some(
            (a) => a.actorId === bot.id && a.actionType === 'wild_child_model' && a.dayNumber === 1
          );
          if (!hasActed) {
            const candidates = alivePlayers.filter((p) => p.id !== bot.id);
            if (candidates.length > 0) {
              const target = candidates[Math.floor(Math.random() * candidates.length)];
              updatePlayerState(room.id, bot.id, { fosterParentId: target.id });
              submitNightAction(room.id, {
                actorId: bot.id,
                actorRole: bot.role,
                targetId: target.id,
                actionType: 'wild_child_model',
                dayNumber: 1,
              });
            }
          }
        } else if (room.nightStep === 'guard' && bot.role === 'guard' && !room.villagePowersLost) {
          const hasActed = actions.some(
            (a) => a.actorId === bot.id && a.actionType === 'guard_protect' && a.dayNumber === room.dayNumber
          );
          if (!hasActed) {
            const lastGuardAction = actions.find(
              (a) => a.actionType === 'guard_protect' && a.dayNumber === room.dayNumber - 1
            );
            const prevTargetId = lastGuardAction?.targetId;
            const validTargets = alivePlayers.filter((p) => p.id !== prevTargetId);
            const pool = validTargets.length > 0 ? validTargets : alivePlayers;
            const t = pool[Math.floor(Math.random() * pool.length)];
            if (t) {
              submitNightAction(room.id, {
                actorId: bot.id,
                actorRole: bot.role,
                targetId: t.id,
                actionType: 'guard_protect',
                dayNumber: room.dayNumber,
              });
            }
          }
        } else if (room.nightStep === 'seer' && bot.role === 'seer' && !room.villagePowersLost) {
          const hasActed = actions.some(
            (a) => a.actorId === bot.id && a.actionType === 'seer_inspect' && a.dayNumber === room.dayNumber
          );
          if (!hasActed) {
            const t = alivePlayers.filter((p) => p.id !== bot.id)[0];
            if (t) {
              submitNightAction(room.id, {
                actorId: bot.id,
                actorRole: bot.role,
                targetId: t.id,
                actionType: 'seer_inspect',
                dayNumber: room.dayNumber,
              });
            }
          }
        } else if (room.nightStep === 'curse_wolf' && bot.role === 'curse_wolf') {
          const hasUsedCurseEver = actions.some(
            (a) => a.actorId === bot.id && a.actionType === 'curse_wolf_curse' && a.targetId
          );
          const hasActedTonight = actions.some(
            (a) => a.actorId === bot.id && a.actionType === 'curse_wolf_curse' && a.dayNumber === room.dayNumber
          );
          if (!hasUsedCurseEver && !hasActedTonight) {
            const wolfAction = actions.find((a) => a.actionType === 'wolf_bite' && a.dayNumber === room.dayNumber);
            const victimId = wolfAction?.targetId;
            const victimP = players.find((p) => p.id === victimId);
            if (victimP && victimP.isAlive && !victimP.role.includes('wolf') && Math.random() < 0.4) {
              submitNightAction(room.id, {
                actorId: bot.id,
                actorRole: bot.role,
                targetId: victimP.id,
                actionType: 'curse_wolf_curse',
                dayNumber: room.dayNumber,
              });
            }
          }
        } else if (room.nightStep === 'white_wolf' && bot.role === 'white_wolf') {
          const hasActedTonight = actions.some(
            (a) => a.actorId === bot.id && a.actionType === 'white_wolf_kill' && a.dayNumber === room.dayNumber
          );
          if (!hasActedTonight) {
            const otherWolves = alivePlayers.filter(
              (p) => p.id !== bot.id && (p.team === 'werewolves' || p.role.includes('wolf'))
            );
            if (otherWolves.length > 0 && Math.random() < 0.6) {
              const target = otherWolves[Math.floor(Math.random() * otherWolves.length)];
              submitNightAction(room.id, {
                actorId: bot.id,
                actorRole: bot.role,
                targetId: target.id,
                actionType: 'white_wolf_kill',
                dayNumber: room.dayNumber,
              });
            }
          }
        } else if (room.nightStep === 'dire_wolf' && bot.role === 'dire_wolf') {
          const hasActedTonight = actions.some(
            (a) => a.actorId === bot.id && a.actionType === 'dire_wolf_kill' && a.dayNumber === room.dayNumber
          );
          if (!hasActedTonight) {
            const nonWolves = alivePlayers.filter(
              (p) => p.id !== bot.id && p.team !== 'werewolves' && !p.role.includes('wolf')
            );
            if (nonWolves.length > 0) {
              const target = nonWolves[Math.floor(Math.random() * nonWolves.length)];
              submitNightAction(room.id, {
                actorId: bot.id,
                actorRole: bot.role,
                targetId: target.id,
                actionType: 'dire_wolf_kill',
                dayNumber: room.dayNumber,
              });
            }
          }
        } else if (room.nightStep === 'witch' && bot.role === 'witch' && !room.villagePowersLost) {
          const hasUsedPoisonEver = actions.some(
            (a) => a.actorId === bot.id && a.actionType === 'witch_poison' && a.targetId
          );
          const hasUsedHealEver = actions.some(
            (a) => a.actorId === bot.id && a.actionType === 'witch_heal' && a.targetId && !a.isRefunded
          );
          const hasActedTonight = actions.some(
            (a) => a.actorId === bot.id && (a.actionType === 'witch_poison' || a.actionType === 'witch_heal') && a.dayNumber === room.dayNumber
          );

          if (!hasActedTonight) {
            const wolfAction = actions.find((a) => a.actionType === 'wolf_bite' && a.dayNumber === room.dayNumber);
            const victimId = wolfAction?.targetId;

            if (victimId && !hasUsedHealEver && Math.random() < 0.6) {
              submitNightAction(room.id, {
                actorId: bot.id,
                actorRole: bot.role,
                targetId: 'auto_wolf_victim',
                actionType: 'witch_heal',
                dayNumber: room.dayNumber,
              });
            } else if (!hasUsedPoisonEver && room.dayNumber >= 2 && Math.random() < 0.35) {
              const targets = alivePlayers.filter(
                (p) => p.id !== bot.id && p.id !== victimId && !p.role.includes('wolf')
              );
              if (targets.length > 0) {
                const t = targets[Math.floor(Math.random() * targets.length)];
                submitNightAction(room.id, {
                  actorId: bot.id,
                  actorRole: bot.role,
                  targetId: t.id,
                  actionType: 'witch_poison',
                  dayNumber: room.dayNumber,
                });
              }
            }
          }
        } else if (room.nightStep === 'fox' && bot.role === 'fox' && !room.villagePowersLost && !bot.foxLostPower) {
          const hasActed = actions.some(
            (a) => a.actorId === bot.id && a.actionType === 'fox_sniff' && a.dayNumber === room.dayNumber
          );
          if (!hasActed) {
            const targets = alivePlayers.filter((p) => p.id !== bot.id);
            if (targets.length > 0) {
              const countToPick = Math.min(3, targets.length);
              const shuffled = [...targets].sort(() => Math.random() - 0.5);
              const chosen = shuffled.slice(0, countToPick);

              for (const t of chosen) {
                submitNightAction(room.id, {
                  actorId: bot.id,
                  actorRole: bot.role,
                  targetId: t.id,
                  actionType: 'fox_sniff',
                  dayNumber: room.dayNumber,
                });
              }

              const hasWolf = chosen.some((p) => p.team === 'werewolves' || p.role.includes('wolf'));
              if (!hasWolf) {
                await updatePlayerState(room.id, bot.id, { foxLostPower: true });
              }
            }
          }
        } else if (room.nightStep === 'piper' && bot.role === 'piper') {
          const tonightBotPiperActions = actions.filter(
            (a) => a.actorId === bot.id && a.actionType === 'piper_enchant' && a.dayNumber === room.dayNumber
          );
          if (tonightBotPiperActions.length < 2) {
            const tonightChosenIds = tonightBotPiperActions.map((a) => a.targetId).filter(Boolean);
            const validTargets = alivePlayers.filter(
              (p) => p.id !== bot.id && !pastEnchantedTargetIds.includes(p.id) && !tonightChosenIds.includes(p.id)
            );
            const needed = 2 - tonightBotPiperActions.length;
            const targetsToPick = validTargets.slice(0, needed);
            for (const t of targetsToPick) {
              submitNightAction(room.id, {
                actorId: bot.id,
                actorRole: bot.role,
                targetId: t.id,
                actionType: 'piper_enchant',
                dayNumber: room.dayNumber,
              });
            }
          }
        }
      });

      // Bots execute their night actions automatically, but night step transitions ONLY occur when players click Next.
    } else if (room.status === 'day_voting') {
      // Auto-bot votes (Excluding Idiot who was saved from voting and from being targeted)
      const bots = alivePlayers.filter((p) => p.isBot && !p.idiotSaved);
      bots.forEach((bot) => {
        const hasVoted = votes.some((v) => v.voterId === bot.id && v.type === 'nominate');
        if (!hasVoted) {
          const candidates = alivePlayers.filter((p) => p.id !== bot.id && !p.idiotSaved);
          if (candidates.length > 0) {
            const target = candidates[Math.floor(Math.random() * candidates.length)];
            submitVote(room.id, {
              voterId: bot.id,
              targetId: target.id,
              type: 'nominate',
            });
          }
        }
      });
    } else if (room.status === 'day_verdict') {
      // Auto-bot verdict votes (Excluding Idiot who was saved)
      const bots = alivePlayers.filter((p) => p.isBot && !p.idiotSaved);
      bots.forEach((bot) => {
        const hasVoted = votes.some((v) => v.voterId === bot.id && v.type === 'verdict');
        if (!hasVoted) {
          const choice = Math.random() > 0.4 ? 'execute' : 'pardon';
          submitVote(room.id, {
            voterId: bot.id,
            targetId: choice,
            type: 'verdict',
          });
        }
      });
    }
  }, [room.status, room.nightStep, actions.length, votes.length]);

  // Bot Management Handlers
  const handleAddBots = async (count: number) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      const botNamesToUse = getUniqueBotNames(players, count);
      const botPlayers: Player[] = [];
      for (let i = 0; i < count; i++) {
        const botId = 'bot_' + Math.random().toString(36).substring(2, 9);
        botPlayers.push({
          id: botId,
          name: botNamesToUse[i],
          avatar: BOT_AVATARS[(players.length + i) % BOT_AVATARS.length],
          isHost: false,
          isAlive: true,
          role: 'villager',
          team: 'villagers',
          isBot: true,
        });
      }
      await batchJoinPlayers(room.id, botPlayers);
    } catch (err) {
      console.error('Error adding bots:', err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRemoveBot = async (botId?: string) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      const bots = players.filter((p) => p.isBot);
      if (bots.length === 0) return;
      const targetBot = botId ? bots.find((b) => b.id === botId) : bots[bots.length - 1];
      if (targetBot) {
        await leaveRoom(room.id, targetBot.id);
      }
    } catch (err) {
      console.error('Error removing bot:', err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRemoveAllBots = async () => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      const bots = players.filter((p) => p.isBot);
      for (const bot of bots) {
        await leaveRoom(room.id, bot.id);
      }
    } catch (err) {
      console.error('Error removing all bots:', err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Host Start Match
  const handleStartMatch = async () => {
    const targetPlayerCount = room.rolesList && room.rolesList.length > 0 ? room.rolesList.length : 8;
    if (players.length < targetPlayerCount) {
      setMinPlayersModalOpen(true);
      return;
    }

    setIsProcessingAction(true);
    try {
      // Shuffle roles list and assign to players
      const presetRoles = [...room.rolesList];
      while (presetRoles.length < players.length) {
        presetRoles.push('villager');
      }

      const shuffled = [...presetRoles].sort(() => Math.random() - 0.5);

      const assignedPlayers = players.map((p, i) => ({
        ...p,
        role: shuffled[i],
        team: ROLE_DEFINITIONS[shuffled[i]]?.team || 'villagers',
        isAlive: true,
      }));

      const playerUpdates = players.map((p, i) => {
        const assignedRole = shuffled[i];
        const rMeta = ROLE_DEFINITIONS[assignedRole];
        return {
          id: p.id,
          updates: {
            role: assignedRole,
            team: rMeta.team,
            isAlive: true,
          },
        };
      });

      await batchUpdatePlayers(room.id, playerUpdates);
      await clearNightActionsAndVotes(room.id);

      const validSteps = getValidNightSteps(1, presetRoles, assignedPlayers);
      const firstNightStep = validSteps[0] || 'werewolves';

      await updateRoomState(room.id, {
        status: 'night',
        dayNumber: 1,
        nightStep: firstNightStep,
        phaseEndTime: Date.now() + 30000,
      });
    } catch (err) {
      console.error('Error starting match:', err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Night Action Submission
  const handlePerformNightAction = async (targetId: string) => {
    if (!isAlive) return;

    // Touching own card is for flipping/revealing role
    if (targetId === currentPlayer.id) return;

    const targetPlayer = players.find((p) => p.id === targetId);
    if (!targetPlayer || !targetPlayer.isAlive) return;

    const step = room.nightStep;
    const myRoleName = ROLE_DEFINITIONS[currentPlayer.role]?.name || 'Dân Làng';

    if (step === 'seer') {
      if (currentPlayer.role !== 'seer') {
        showToast(`Hệ thống đang tương tác riêng với Tiên Tri. Bạn là ${myRoleName}, hãy giữ im lặng!`);
        return;
      }

      if (room.villagePowersLost) {
        showToast('⚡ Dân làng đã treo cổ Già Làng! Tiên Tri đã MẤT HOÀN TOÀN khả năng soi chiếu.');
        return;
      }

      // Check if Seer already inspected someone tonight
      const mySeerActions = actions.filter(
        (a) => a.actorId === currentPlayer.id && a.actionType === 'seer_inspect' && a.dayNumber === room.dayNumber
      );

      if (mySeerActions.length >= 1) {
        showToast('Đêm nay bạn đã đoán 1 người rồi! Quyền đoán của Tiên Tri đã bị khóa cho đến đêm tiếp theo.');
        return;
      }

      const isWolf = (targetPlayer.role.includes('wolf') && targetPlayer.role !== 'wolf_man') || targetPlayer.team === 'werewolves';
      const resultText = isWolf
        ? `ĐÚNG! ${targetPlayer.name} CHÍNH LÀ SÓI! 🐺`
        : `SAI! ${targetPlayer.name} KHÔNG PHẢI SÓI (Phe Dân Làng). 🧑‍🌾`;

      setSeerResult(resultText);
      soundEffects.playChimeBell();

      await submitNightAction(room.id, {
        actorId: currentPlayer.id,
        actorRole: currentPlayer.role,
        targetId,
        actionType: 'seer_inspect',
        dayNumber: room.dayNumber,
      });
      setSelectedTargetId(targetId);
      showToast(`Kết quả dự đoán của Tiên Tri: ${resultText}`);
      return;
    }

    if (step === 'werewolves') {
      const isWolf = currentPlayer.role.includes('wolf') || currentPlayer.team === 'werewolves';
      if (!isWolf) {
        showToast(`Hệ thống đang tương tác riêng với Sói. Bạn là ${myRoleName}, hãy nhắm mắt đi ngủ!`);
        return;
      }

      await submitNightAction(room.id, {
        actorId: currentPlayer.id,
        actorRole: currentPlayer.role,
        targetId,
        actionType: 'wolf_bite',
        dayNumber: room.dayNumber,
      });
      setSelectedTargetId(targetId);
      soundEffects.playHowl();
      showToast(`Đã chọn/thay đổi con mồi! Ma Sói đã chọn cắn ${targetPlayer.name} đêm nay. Bạn có thể chọn người khác hoặc bấm "Tiếp Theo" để chốt.`);
      return;
    }

    if (step === 'guard') {
      if (currentPlayer.role !== 'guard') {
        showToast(`Hệ thống đang tương tác riêng với Bảo Vệ. Bạn là ${myRoleName}, hãy nhắm mắt đi ngủ!`);
        return;
      }

      if (room.villagePowersLost) {
        showToast('⚡ Dân làng đã treo cổ Già Làng! Bảo Vệ đã MẤT HOÀN TOÀN khả năng che chở.');
        return;
      }

      const lastGuardAction = actions.find(
        (a) => a.actionType === 'guard_protect' && a.dayNumber === room.dayNumber - 1
      );
      if (lastGuardAction && lastGuardAction.targetId === targetId) {
        const prevTarget = players.find((p) => p.id === lastGuardAction.targetId);
        showToast(`⚠️ Bảo Vệ không thể bảo vệ cùng 1 người (${prevTarget?.name || 'mục tiêu đêm trước'}) trong 2 đêm liên tiếp! Vui lòng chọn người khác.`);
        return;
      }

      await submitNightAction(room.id, {
        actorId: currentPlayer.id,
        actorRole: currentPlayer.role,
        targetId,
        actionType: 'guard_protect',
        dayNumber: room.dayNumber,
      });
      setSelectedTargetId(targetId);
      soundEffects.playChimeBell();
      showToast(`Đã chọn/thay đổi mục tiêu bảo vệ: ${targetPlayer.name}. Bạn có thể đổi người khác hoặc bấm "Tiếp Theo" để chốt.`);
      return;
    }

    if (step === 'cupid') {
      if (currentPlayer.role !== 'cupid') {
        showToast(`Hệ thống đang tương tác riêng với Thần Tình Yêu. Bạn là ${myRoleName}, hãy nhắm mắt đi ngủ!`);
        return;
      }

      const myCupidActions = actions.filter(
        (a) => a.actorId === currentPlayer.id && a.actionType === 'cupid_link' && a.dayNumber === 1
      );

      await submitNightAction(room.id, {
        actorId: currentPlayer.id,
        actorRole: currentPlayer.role,
        targetId,
        actionType: 'cupid_link',
        dayNumber: room.dayNumber,
      });
      setSelectedTargetId(targetId);
      soundEffects.playChimeBell();

      if (myCupidActions.length === 0) {
        showToast(`Đã chọn người thứ 1: ${targetPlayer.name}. Hãy chọn tiếp 1 người nữa để se duyên!`);
      } else {
        showToast(`Đã chọn người thứ 2: ${targetPlayer.name}. Hai trái tim đã được gắn kết! Bấm "Tiếp Theo" để chốt.`);
      }
      return;
    }

    if (step === 'wild_child') {
      if (currentPlayer.role !== 'wild_child') {
        showToast(`Hệ thống đang tương tác riêng với Đứa Trẻ Hoang Dã. Bạn là ${myRoleName}, hãy nhắm mắt đi ngủ!`);
        return;
      }

      await updatePlayerState(room.id, currentPlayer.id, { fosterParentId: targetId });
      await submitNightAction(room.id, {
        actorId: currentPlayer.id,
        actorRole: currentPlayer.role,
        targetId,
        actionType: 'wild_child_model',
        dayNumber: room.dayNumber,
      });
      setSelectedTargetId(targetId);
      soundEffects.playChimeBell();
      showToast(`Đã chọn ${targetPlayer.name} làm CHA/ MẸ ĐỠ ĐẦU của bạn! Nếu ${targetPlayer.name} qua đời, bạn sẽ hóa thành SÓI.`);
      return;
    }

    if (step === 'white_wolf') {
      if (currentPlayer.role !== 'white_wolf') {
        showToast(`Hệ thống đang tương tác riêng với Sói Trắng. Bạn là ${myRoleName}, hãy nhắm mắt đi ngủ!`);
        return;
      }

      if (!targetPlayer.isAlive) {
        showToast('Chỉ có thể chọn cắn người chơi còn sống!');
        return;
      }

      if (targetPlayer.id === currentPlayer.id) {
        showToast('Bạn không thể tự cắn chính mình!');
        return;
      }

      const isTargetWolf = targetPlayer.team === 'werewolves' || targetPlayer.role.includes('wolf');
      if (!isTargetWolf) {
        showToast('Sói Trắng chỉ có thể chọn cắn 1 con Sói khác trong bầy!');
        return;
      }

      const tonightWhiteWolfAction = actions.find(
        (a) => a.actorId === currentPlayer.id && a.actionType === 'white_wolf_kill' && a.dayNumber === room.dayNumber
      );

      if (tonightWhiteWolfAction && tonightWhiteWolfAction.targetId === targetId) {
        await submitNightAction(room.id, {
          actorId: currentPlayer.id,
          actorRole: currentPlayer.role,
          targetId: '',
          actionType: 'white_wolf_kill',
          dayNumber: room.dayNumber,
        });
        showToast(`Đã hủy cắn ${targetPlayer.name}.`);
      } else {
        await submitNightAction(room.id, {
          actorId: currentPlayer.id,
          actorRole: currentPlayer.role,
          targetId,
          actionType: 'white_wolf_kill',
          dayNumber: room.dayNumber,
        });
        setSelectedTargetId(targetId);
        soundEffects.playHowl();
        showToast(`Sói Trắng đã chọn cắn đồng bầy: ${targetPlayer.name}!`);
      }
      return;
    }

    if (step === 'dire_wolf') {
      if (currentPlayer.role !== 'dire_wolf') {
        showToast(`Hệ thống đang tương tác riêng với Sói Hùm. Bạn là ${myRoleName}, hãy nhắm mắt đi ngủ!`);
        return;
      }

      if (!targetPlayer.isAlive) {
        showToast('Chỉ có thể chọn cắn người chơi còn sống!');
        return;
      }

      if (targetPlayer.id === currentPlayer.id) {
        showToast('Bạn không thể tự cắn chính mình!');
        return;
      }

      const isTargetWolf = targetPlayer.team === 'werewolves' || targetPlayer.role.includes('wolf');
      if (isTargetWolf) {
        showToast('Sói Hùm không thể cắn đồng bọn Ma Sói!');
        return;
      }

      const tonightDireWolfAction = actions.find(
        (a) => a.actorId === currentPlayer.id && a.actionType === 'dire_wolf_kill' && a.dayNumber === room.dayNumber
      );

      if (tonightDireWolfAction && tonightDireWolfAction.targetId === targetId) {
        await submitNightAction(room.id, {
          actorId: currentPlayer.id,
          actorRole: currentPlayer.role,
          targetId: '',
          actionType: 'dire_wolf_kill',
          dayNumber: room.dayNumber,
        });
        showToast(`Đã hủy cắn ${targetPlayer.name}.`);
      } else {
        await submitNightAction(room.id, {
          actorId: currentPlayer.id,
          actorRole: currentPlayer.role,
          targetId,
          actionType: 'dire_wolf_kill',
          dayNumber: room.dayNumber,
        });
        setSelectedTargetId(targetId);
        soundEffects.playHowl();
        showToast(`Sói Hùm đã chọn cắn thêm con mồi thứ 2: ${targetPlayer.name}!`);
      }
      return;
    }

    if (step === 'fox') {
      if (currentPlayer.role !== 'fox') {
        showToast(`Hệ thống đang tương tác riêng với Cáo. Bạn là ${myRoleName}, hãy nhắm mắt đi ngủ!`);
        return;
      }

      if (room.villagePowersLost) {
        showToast('⚡ Dân làng đã treo cổ Già Làng! Cáo đã MẤT HOÀN TOÀN khả năng ngửi mùi Sói.');
        return;
      }

      if (currentPlayer.foxLostPower) {
        showToast('Cáo đã bị MẤT KHẢ NĂNG do lần ngửi hơi trước đó không có Ma Sói nào!');
        return;
      }

      if (!targetPlayer.isAlive) {
        showToast('Cáo chỉ có thể chọn kiểm tra người chơi CÒN SỐNG!');
        return;
      }

      const myFoxActions = actions.filter(
        (a) => a.actorId === currentPlayer.id && a.actionType === 'fox_sniff' && a.dayNumber === room.dayNumber && a.targetId
      );

      const existingAction = myFoxActions.find((a) => a.targetId === targetId);
      if (existingAction) {
        await deleteNightAction(room.id, existingAction);
        showToast(`Đã hủy chọn ${targetPlayer.name}.`);
        return;
      }

      const alivePlayers = players.filter((p) => p.isAlive);
      const maxTargets = Math.min(3, alivePlayers.length);

      if (myFoxActions.length >= maxTargets) {
        showToast(`Đêm nay bạn đã chọn đủ ${maxTargets} người rồi! Hãy bấm vào người đã chọn nếu muốn bỏ chọn để đổi mục tiêu.`);
        return;
      }

      await submitNightAction(room.id, {
        actorId: currentPlayer.id,
        actorRole: currentPlayer.role,
        targetId,
        actionType: 'fox_sniff',
        dayNumber: room.dayNumber,
      });
      setSelectedTargetId(targetId);
      soundEffects.playChimeBell();

      const updatedTonightTargetIds = [...myFoxActions.map((a) => a.targetId), targetId];

      if (updatedTonightTargetIds.length === maxTargets) {
        const checkedPlayers = players.filter((p) => updatedTonightTargetIds.includes(p.id));
        const hasWolf = checkedPlayers.some((p) => p.team === 'werewolves' || p.role.includes('wolf'));

        if (hasWolf) {
          showToast(`🦊 MẮT THẦN THÔNG: Có ÍT NHẤT 1 MA SÓI nằm trong nhóm 3 người bạn chọn [${checkedPlayers.map((p) => p.name).join(', ')}]! Bạn tiếp tục giữ năng lực.`);
        } else {
          showToast(`❌ MẮT THẦN KINH: KHÔNG CÓ MA SÓI NÀO trong nhóm 3 người bạn chọn [${checkedPlayers.map((p) => p.name).join(', ')}]! Cáo đã MẤT HOÀN TOÀN NĂNG LỰC.`);
          await updatePlayerState(room.id, currentPlayer.id, { foxLostPower: true });
        }
      } else {
        showToast(`🦊 Đã chọn mục tiêu thứ ${updatedTonightTargetIds.length}: ${targetPlayer.name}. Hãy chọn tiếp ${maxTargets - updatedTonightTargetIds.length} người nữa!`);
      }
      return;
    }

    if (step === 'witch') {
      if (currentPlayer.role !== 'witch') {
        showToast(`Hệ thống đang tương tác riêng với Phù Thủy. Bạn là ${myRoleName}, hãy nhắm mắt đi ngủ!`);
        return;
      }

      if (room.villagePowersLost) {
        showToast('⚡ Dân làng đã treo cổ Già Làng! Phù Thủy đã MẤT HOÀN TOÀN khả năng dùng thuốc.');
        return;
      }

      if (hasUsedPoisonInPast) {
        showToast('Bạn đã sử dụng Bình Thuốc Độc trong đêm trước rồi và không thể dùng thêm lần nữa trong ván này!');
        return;
      }

      if (tonightPoisonAction && tonightPoisonAction.targetId === targetId) {
        await submitNightAction(room.id, {
          actorId: currentPlayer.id,
          actorRole: currentPlayer.role,
          targetId: '',
          actionType: 'witch_poison',
          dayNumber: room.dayNumber,
        });
        showToast(`Đã hủy hạ độc ${targetPlayer.name}.`);
      } else {
        await submitNightAction(room.id, {
          actorId: currentPlayer.id,
          actorRole: currentPlayer.role,
          targetId,
          actionType: 'witch_poison',
          dayNumber: room.dayNumber,
        });
        setSelectedTargetId(targetId);
        soundEffects.playChimeBell();
        showToast(`Đã chọn hạ độc: ${targetPlayer.name}. Bạn có thể bấm nút Hủy Hạ Độc trong bảng điều khiển nếu đổi ý.`);
      }
      return;
    }

    if (step === 'piper') {
      if (currentPlayer.role !== 'piper') {
        showToast(`Hệ thống đang tương tác riêng với Người Thổi Sáo. Bạn là ${myRoleName}, hãy nhắm mắt đi ngủ!`);
        return;
      }

      if (!targetPlayer.isAlive) {
        showToast('Người Thổi Sáo không thể thôi miên người đã CHẾT! Vui lòng chọn người CÒN SỐNG.');
        return;
      }

      if (pastEnchantedTargetIds.includes(targetId)) {
        showToast(`[${targetPlayer.name}] đã bị thôi miên từ các đêm trước rồi! Vui lòng chọn người chưa bị thôi miên.`);
        return;
      }

      const myPiperActions = actions.filter(
        (a) => a.actorId === currentPlayer.id && a.actionType === 'piper_enchant' && a.dayNumber === room.dayNumber && a.targetId
      );

      const existingAction = myPiperActions.find((a) => a.targetId === targetId);
      if (existingAction) {
        await deleteNightAction(room.id, existingAction);
        showToast(`Đã hủy thôi miên ${targetPlayer.name}.`);
        return;
      }

      if (myPiperActions.length >= 2) {
        showToast('Bạn đã chọn đủ 2 người để thôi miên đêm nay rồi! Hãy nhấp vào người đã chọn nếu muốn bỏ chọn.');
        return;
      }

      await submitNightAction(room.id, {
        actorId: currentPlayer.id,
        actorRole: currentPlayer.role,
        targetId,
        actionType: 'piper_enchant',
        dayNumber: room.dayNumber,
      });
      setSelectedTargetId(targetId);
      soundEffects.playChimeBell();

      if (myPiperActions.length === 0) {
        showToast(`Đã chọn thôi miên người thứ 1: ${targetPlayer.name}. Hãy chọn tiếp 1 người nữa!`);
      } else {
        showToast(`Đã chọn thôi miên người thứ 2: ${targetPlayer.name}. Cả 2 đã chìm vào giấc mộng thôi miên!`);
      }
      return;
    }
  };

  // Death Consequences Handler (Lovers heartbreak, Wild Child transformation)
  const handlePlayerDeathConsequences = async (deadPlayer: Player): Promise<string[]> => {
    const extraDeadIds: string[] = [];

    // 1. Lover Heartbreak
    if (deadPlayer.loverId) {
      const lover = players.find((p) => p.id === deadPlayer.loverId && p.isAlive);
      if (lover) {
        lover.isAlive = false;
        const timingStr = room.status === 'night' ? `Chết đêm ngày ${room.dayNumber}` : `Chết sáng ngày ${room.dayNumber}`;
        await updatePlayerState(room.id, lover.id, {
          isAlive: false,
          deathReason: `Đau xót và Chết đứng khi người yêu (${deadPlayer.name}) qua đời`,
          deathTiming: timingStr,
        });
        extraDeadIds.push(lover.id);

        if (room.status !== 'night') {
          const loverMsg = `💔 CON TIM TAN VỠ: Khi ${deadPlayer.name.toUpperCase()} qua đời, người yêu ${lover.name.toUpperCase()} đã gục ngã và chết theo!`;
          announceNarrator(loverMsg, 'death');
          await sendChatMessage(room.id, {
            senderId: 'system',
            senderName: 'Quản Trò',
            content: loverMsg,
            channel: 'global',
            type: 'system',
            createdAt: Date.now(),
          });
        }

        // If lover was Hunter
        if (lover.role === 'hunter') {
          if (lover.isBot) {
            const aliveTargets = players.filter((p) => p.isAlive && p.id !== lover.id && !extraDeadIds.includes(p.id));
            if (aliveTargets.length > 0) {
              const botTarget = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
              await updatePlayerState(room.id, botTarget.id, {
                isAlive: false,
                deathReason: `Bị Thợ Săn ${lover.name} bắn gục`,
                deathTiming: timingStr,
              });
              extraDeadIds.push(botTarget.id);

              if (room.status !== 'night') {
                const hunterMsg = `🎯 THỢ SĂN ${lover.name.toUpperCase()} TRƯỚC KHI TỰ SÁT ĐÃ GIƯƠNG CUNG BẮN GỤC ${botTarget.name.toUpperCase()}!`;
                announceNarrator(hunterMsg, 'death');
                await sendChatMessage(room.id, {
                  senderId: 'system',
                  senderName: 'Quản Trò',
                  content: hunterMsg,
                  channel: 'global',
                  type: 'system',
                  createdAt: Date.now(),
                });
              }

              const nestedDead = await handlePlayerDeathConsequences(botTarget);
              extraDeadIds.push(...nestedDead);
            }
          } else {
            await updateRoomState(room.id, {
              pendingHunterShot: {
                hunterId: lover.id,
                hunterName: lover.name,
                reason: 'Tự sát vì xót thương người yêu',
              },
            });
          }
        }
      }
    }

    // 2. Wild Child Transformation
    const wildChildren = players.filter((p) => p.isAlive && p.role === 'wild_child' && p.fosterParentId === deadPlayer.id);
    for (const wc of wildChildren) {
      await updatePlayerState(room.id, wc.id, {
        team: 'werewolves',
        isWolfTransformed: true,
      });
      await updateRoomState(room.id, { newWolfAppearedDay: room.dayNumber });
      const wcMsg = `🐺 THÔNG BÁO: Đã có thêm 1 con Sói xuất hiện trong làng!`;
      announceNarrator(wcMsg, 'howl');
      await sendChatMessage(room.id, {
        senderId: 'system',
        senderName: 'Quản Trò',
        content: wcMsg,
        channel: 'global',
        type: 'system',
        createdAt: Date.now(),
      });
    }

    return extraDeadIds;
  };

  // Host Next Night Step Controller
  const handleAdvanceNightStep = async () => {
    const validSteps = getValidNightSteps(room.dayNumber, room.rolesList, players);
    const currentIndex = validSteps.indexOf(room.nightStep);

    if (currentIndex >= 0 && currentIndex < validSteps.length - 1) {
      const nextStep = validSteps[currentIndex + 1];
      if (nextStep === 'done') {
        // Resolve Night Actions for current dayNumber
        const tonightActions = actions.filter((a) => a.dayNumber === room.dayNumber);

        // Process Cupid Lover link if Night 1
        if (room.dayNumber === 1) {
          const cupidLinks = tonightActions.filter((a) => a.actionType === 'cupid_link' && a.targetId);
          if (cupidLinks.length >= 2) {
            const p1 = cupidLinks[0].targetId;
            const p2 = cupidLinks[1].targetId;
            if (p1 && p2 && p1 !== p2) {
              await updatePlayerState(room.id, p1, { loverId: p2 });
              await updatePlayerState(room.id, p2, { loverId: p1 });

              // Sync in-memory objects so same-night death consequences recognize the link!
              const player1 = players.find((p) => p.id === p1);
              const player2 = players.find((p) => p.id === p2);
              if (player1) player1.loverId = p2;
              if (player2) player2.loverId = p1;
            }
          }
        }

        // Tally Werewolf bite votes to determine unified wolf target
        const wolfBites = tonightActions.filter((a) => a.actionType === 'wolf_bite');
        let wolfTargetId: string | null = null;
        if (wolfBites.length > 0) {
          const biteCounts: Record<string, number> = {};
          wolfBites.forEach((wb) => {
            if (wb.targetId) {
              biteCounts[wb.targetId] = (biteCounts[wb.targetId] || 0) + 1;
            }
          });
          let maxBites = 0;
          let topTargets: string[] = [];
          Object.entries(biteCounts).forEach(([tId, count]) => {
            if (count > maxBites) {
              maxBites = count;
              topTargets = [tId];
            } else if (count === maxBites) {
              topTargets.push(tId);
            }
          });
          if (topTargets.length > 0) {
            const isRandomWolfPick = topTargets.length > 1;
            wolfTargetId = topTargets[Math.floor(Math.random() * topTargets.length)];

            // Record system action for final wolf target and random status
            await submitNightAction(room.id, {
              actorId: 'system_wolf',
              actorRole: 'werewolf',
              targetId: wolfTargetId,
              actionType: isRandomWolfPick ? 'wolf_final_kill_random' : 'wolf_final_kill',
              dayNumber: room.dayNumber,
            });
          }
        }

        // Guard Protection
        const guardAction = tonightActions.find((a) => a.actionType === 'guard_protect');
        const protectedTargetId = guardAction?.targetId;

        // Curse Wolf Action
        const curseWolfAction = tonightActions.find((a) => a.actionType === 'curse_wolf_curse' && a.targetId);
        const cursedTargetId = curseWolfAction?.targetId;

        // Witch Heal
        const witchHealAction = tonightActions.find((a) => a.actionType === 'witch_heal');
        let healedTargetId: string | null = null;

        if (witchHealAction) {
          if (wolfTargetId && wolfTargetId === protectedTargetId) {
            // Guard already saved the target! Refund Witch's Heal potion
            await submitNightAction(room.id, {
              actorId: witchHealAction.actorId,
              actorRole: 'witch',
              targetId: 'refunded',
              actionType: 'witch_heal',
              dayNumber: room.dayNumber,
              isRefunded: true,
            });
            const refundMsg = `🛡️ BẢO VỆ XUẤT SẮC: Đêm nay Bảo Vệ đã chở che thành công cho nạn nhân của Sói! Phù Thủy không tốn GIẢI DƯỢC và có thể dùng cho các đêm sau.`;
            announceNarrator(refundMsg, 'chime');
            await sendChatMessage(room.id, {
              senderId: 'system',
              senderName: 'Quản Trò',
              content: refundMsg,
              channel: 'global',
              type: 'system',
              createdAt: Date.now(),
            });
          } else if (wolfTargetId) {
            healedTargetId = wolfTargetId;
            // Record actual saved targetId for activity log
            await submitNightAction(room.id, {
              actorId: witchHealAction.actorId,
              actorRole: 'witch',
              targetId: healedTargetId,
              actionType: 'witch_heal',
              dayNumber: room.dayNumber,
            });
          }
        }

        // Witch Poison
        const witchPoisonAction = tonightActions.find((a) => a.actionType === 'witch_poison');
        const poisonedTargetId = witchPoisonAction?.targetId;

        // White Wolf Kill
        const whiteWolfAction = tonightActions.find((a) => a.actionType === 'white_wolf_kill' && a.targetId);
        const whiteWolfTargetId = whiteWolfAction?.targetId;

        // Dire Wolf Kill
        const direWolfAction = tonightActions.find((a) => a.actionType === 'dire_wolf_kill' && a.targetId);
        const direWolfTargetId = direWolfAction?.targetId;

        const victimsSet = new Set<string>();

        // Werewolf bite takes effect if target is NOT protected by Guard AND NOT saved by Witch Heal
        if (wolfTargetId && wolfTargetId !== protectedTargetId && wolfTargetId !== healedTargetId) {
          if (cursedTargetId && cursedTargetId === wolfTargetId) {
            // Curse Wolf converts the victim into a Werewolf!
            const cursedP = players.find((p) => p.id === wolfTargetId);
            if (cursedP) {
              await updatePlayerState(room.id, cursedP.id, {
                role: 'werewolf',
                team: 'werewolves',
                isWolfTransformed: true,
              });
              await updateRoomState(room.id, { newWolfAppearedDay: room.dayNumber });
              const curseMsg = `🔮 LỜI NGUYỀN HUYỀN BÍ: Đã xuất hiện thêm 1 con Sói trong trấn.`;
              announceNarrator(curseMsg, 'howl');
              await sendChatMessage(room.id, {
                senderId: 'system',
                senderName: 'Quản Trò',
                content: curseMsg,
                channel: 'global',
                type: 'system',
                createdAt: Date.now(),
              });
            }
          } else {
            // Elder checks 2 lives
            const elderP = players.find((p) => p.id === wolfTargetId && p.role === 'elder');
            if (elderP && !elderP.elderExtraLifeUsed) {
              await updatePlayerState(room.id, elderP.id, { elderExtraLifeUsed: true });
              // Elder surviving 1st bite is kept secret (no public announcement) per rules
            } else {
              victimsSet.add(wolfTargetId);
            }
          }
        }

        // Witch poison takes effect
        if (poisonedTargetId) {
          victimsSet.add(poisonedTargetId);
        }

        // White wolf kill takes effect
        if (whiteWolfTargetId) {
          victimsSet.add(whiteWolfTargetId);
        }

        // Dire wolf kill takes effect if not protected by Guard and not saved by Witch Heal
        if (direWolfTargetId && direWolfTargetId !== protectedTargetId && direWolfTargetId !== healedTargetId) {
          victimsSet.add(direWolfTargetId);
        }

        const victims = Array.from(victimsSet);
        const allNightVictimsSet = new Set<string>(victims);

        // Apply victims death
        let hunterVictim: Player | null = null;
        for (const vicId of victims) {
          const vicPlayer = players.find((p) => p.id === vicId);
          if (vicPlayer) {
            let reason = 'Cái chết bí ẩn trong đêm';
            if (vicId === wolfTargetId && vicId === poisonedTargetId) {
              reason = 'Bị Ma Sói cắn & Phù Thủy đầu độc';
            } else if (vicId === wolfTargetId) {
              reason = 'Bị Ma Sói cắn';
            } else if (vicId === poisonedTargetId) {
              reason = 'Bị Phù Thủy đầu độc';
            } else if (vicId === whiteWolfTargetId) {
              reason = 'Bị Sói Trắng tiêu diệt';
            } else if (vicId === direWolfTargetId) {
              reason = 'Bị Sói Hùm cắn';
            }

            await updatePlayerState(room.id, vicId, {
              isAlive: false,
              deathReason: reason,
              deathTiming: `Chết đêm ngày ${room.dayNumber}`,
            });

            // Trigger death consequences (Lovers, Wild Child, Wolf Cub)
            const extraIds = await handlePlayerDeathConsequences(vicPlayer);
            extraIds.forEach((id) => allNightVictimsSet.add(id));

            if (vicPlayer.role === 'hunter') {
              hunterVictim = vicPlayer;
            }
          }
        }

        // Trigger Hunter ability if Hunter died tonight
        if (hunterVictim) {
          if (hunterVictim.isBot) {
            const aliveTargets = players.filter((p) => p.isAlive && !allNightVictimsSet.has(p.id) && p.id !== hunterVictim!.id);
            if (aliveTargets.length > 0) {
              const botTarget = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
              await updatePlayerState(room.id, botTarget.id, {
                isAlive: false,
                deathReason: `Bị Thợ Săn ${hunterVictim.name} bắn gục`,
                deathTiming: `Chết đêm ngày ${room.dayNumber}`,
              });
              allNightVictimsSet.add(botTarget.id);
              const extraIds = await handlePlayerDeathConsequences(botTarget);
              extraIds.forEach((id) => allNightVictimsSet.add(id));
            }
          } else {
            await updateRoomState(room.id, {
              pendingHunterShot: {
                hunterId: hunterVictim.id,
                hunterName: hunterVictim.name,
                reason: 'Bị hạ gục trong đêm',
              },
            });
          }
        }

        const nextDayNumber = room.dayNumber + 1;

        await updateRoomState(room.id, {
          status: 'day_announcement',
          dayNumber: nextDayNumber,
          lastNightVictimIds: Array.from(allNightVictimsSet),
        });
      } else {
        await updateRoomState(room.id, { nightStep: nextStep });
      }
    } else {
      // Fallback transition to daytime if step unknown or done
      const nextDayNumber = room.dayNumber + 1;
      await updateRoomState(room.id, { status: 'day_announcement', dayNumber: nextDayNumber, lastNightVictimIds: [] });
    }
  };

  // Voting Handling
  const handleCastVote = async (targetId: string) => {
    if (!isAlive || currentPlayer.idiotSaved) return;
    const targetPlayer = players.find((p) => p.id === targetId);
    if (!targetPlayer || !targetPlayer.isAlive || targetPlayer.idiotSaved) return;

    await submitVote(room.id, {
      voterId: currentPlayer.id,
      targetId,
      type: 'nominate',
    });
    setSelectedTargetId(targetId);
  };

  // Host Process Voting Result (Round 1 Tally)
  const handleTallyVotes = async () => {
    const aliveVoterIds = new Set(players.filter((p) => p.isAlive && !p.idiotSaved).map((p) => p.id));
    const latestVotesByVoter = new Map<string, string>();
    votes.forEach((v) => {
      if ((v.type === 'nominate' || !v.type) && aliveVoterIds.has(v.voterId)) {
        latestVotesByVoter.set(v.voterId, v.targetId);
      }
    });

    const voteCounts: Record<string, number> = {};
    latestVotesByVoter.forEach((targetId) => {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

    let maxVotes = 0;
    let topTargetId: string | null = null;

    Object.entries(voteCounts).forEach(([tId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        topTargetId = tId;
      }
    });

    if (topTargetId) {
      const targetPlayer = players.find((p) => p.id === topTargetId);
      if (targetPlayer) {
        // Record village nomination system action for history timeline
        await submitNightAction(room.id, {
          actorId: 'system_village',
          actorRole: 'villager',
          targetId: topTargetId,
          actionType: 'village_nominate',
          dayNumber: room.dayNumber,
        });

        const aliveCount = players.filter((p) => p.isAlive).length;
        const topAnnounce = NARRATOR_SCRIPTS.topVotedAnnounce(targetPlayer.name, maxVotes, aliveCount);

        await sendChatMessage(room.id, {
          senderId: 'system',
          senderName: 'Quản Trò',
          content: topAnnounce,
          channel: 'global',
          type: 'system',
          createdAt: Date.now(),
        });

        if (targetPlayer.role === 'idiot' && !targetPlayer.idiotSaved) {
          await updatePlayerState(room.id, topTargetId, { idiotSaved: true, roleRevealed: true });
          const idiotMsg = `🤡 THẮNG NGỐC: ${targetPlayer.name.toUpperCase()} chính là Thằng Ngốc! Dân làng nhận ra và tha chết (bỏ qua bỏ phiếu treo cổ)!`;
          announceNarrator(idiotMsg, 'chime');
          await sendChatMessage(room.id, {
            senderId: 'system',
            senderName: 'Quản Trò',
            content: idiotMsg,
            channel: 'global',
            type: 'system',
            createdAt: Date.now(),
          });

          const updatedPlayersList = players.map((p) =>
            p.id === topTargetId ? { ...p, idiotSaved: true, roleRevealed: true } : p
          );

          // Check if Stuttering Judge / Quan Tòa Lắp Bắp is active and can trigger 2nd vote
          const judgePlayer = updatedPlayersList.find(
            (p) => p.isAlive && p.role === 'stuttering_judge' && !p.stutteringJudgeUsed
          );
          const canJudgeVote2 = judgePlayer && !room.judgeSecondVotingActive && !room.villagePowersLost;

          await updateRoomState(room.id, {
            status: 'day_verdict',
            accusedPlayerId: topTargetId,
            verdictFinished: true,
            verdictResultText: idiotMsg,
          });

          if (canJudgeVote2) {
            if (isHost && judgePlayer.isBot) {
              setTimeout(async () => {
                if (Math.random() < 0.7) {
                  await handleStutteringJudgeTrigger();
                } else {
                  await proceedToNight(updatedPlayersList);
                }
              }, 3000);
            }
          } else {
            if (isHost) {
              setTimeout(async () => {
                await proceedToNight(updatedPlayersList);
              }, 4000);
            }
          }
        } else {
          const defenseSeconds = 60;
          const defenseEndTime = Date.now() + defenseSeconds * 1000;
          const aliveCount = players.filter((p) => p.isAlive).length;
          const defenseMsg = `BỊ CÁO: ${targetPlayer.name} nhận số phiếu nghi ngờ cao nhất (${maxVotes}/${aliveCount} phiếu). Bị cáo có 1 phút để tự bào chữa!`;

          await sendChatMessage(room.id, {
            senderId: 'system',
            senderName: 'Quản Trò',
            content: defenseMsg,
            channel: 'global',
            type: 'system',
            createdAt: Date.now(),
          });

          await updateRoomState(room.id, {
            status: 'day_defense',
            accusedPlayerId: topTargetId,
            phaseEndTime: defenseEndTime,
          });

          if (isHost && targetPlayer.isBot) {
            setTimeout(async () => {
              const botDefenses = [
                "Tôi hoàn toàn vô tội! Dân làng hãy tin tôi, đừng để Ma Sói dắt mũi!",
                "Tôi là dân làng tốt! Nếu treo cổ tôi, phe Dân sẽ mất đi một lá phiếu quan trọng!",
                "Có kẻ cố tình bom phiếu. Mọi người hãy bình tĩnh tha bổng cho tôi!",
                "Tôi thề tôi không phải Ma Sói! Đêm nay hãy cho Tiên Tri soi tôi!",
                "Tôi chính là Già Làng! Treo cổ tôi, mọi người sẽ hứng chịu cơn giận của thần linh",
                "Tôi là Tiên tri mà. Người vừa nãy mới là Sói!",
                "Sói sẽ thắng nếu dân làng treo cổ tôi!",
                "Tôi là Thiên thần, hãy treo cổ tôi đi",
                "Oan ức quá, Bao đại nhân ơi. Tôi không phải là Sói đâu.",
                "Treo cổ tôi, làng sẽ xuất hiện thêm 1 sói",
                "Tôi mà chết thì thế nào cũng có thêm 1 người chết cùng",
                "Xin hãy tha bổng! Tôi sẽ chứng minh sự trong sạch của mình!"
              ];
              const randomMsg = botDefenses[Math.floor(Math.random() * botDefenses.length)];
              await sendChatMessage(room.id, {
                senderId: targetPlayer.id,
                senderName: targetPlayer.name,
                content: randomMsg,
                channel: 'global',
                type: 'text',
                createdAt: Date.now(),
              });
            }, 2500);
          }
        }
      }
    } else {
      const scapegoat = players.find((p) => p.isAlive && p.role === 'scapegoat');
      if (scapegoat) {
        const sgMsg = `HÒA PHIẾU: Kẻ Thế Mạng ${scapegoat.name.toUpperCase()} đã hy sinh gánh tội thay cho làng!`;
        announceNarrator(sgMsg, 'death');
        await sendChatMessage(room.id, {
          senderId: 'system',
          senderName: 'Quản Trò',
          content: sgMsg,
          channel: 'global',
          type: 'system',
          createdAt: Date.now(),
        });
        await updatePlayerState(room.id, scapegoat.id, {
          isAlive: false,
          deathReason: 'Gánh tội thay do hòa phiếu khi biểu quyết',
          deathTiming: `Chết sáng ngày ${room.dayNumber}`,
        });
        await handlePlayerDeathConsequences(scapegoat);
        await proceedToNight();
      } else {
        const noVoteMsg = 'Không ai bị nhận đủ số phiếu bầu. Dân làng kết thúc ngày và chuyển sang màn đêm!';
        announceNarrator(noVoteMsg);
        await proceedToNight();
      }
    }
  };

  // Verdict Voting Handling (Round 2 Individual Vote)
  const handleCastVerdictVote = async (choice: 'execute' | 'pardon') => {
    if (!isAlive || currentPlayer.idiotSaved) return;
    await submitVote(room.id, {
      voterId: currentPlayer.id,
      targetId: choice,
      type: 'verdict',
    });
  };

  // Verdict Tallying (Round 2 Resolution)
  const handleTallyVerdict = async () => {
    // Only count votes from players who are currently ALIVE, NOT idiotSaved, and NOT the accused player
    const eligibleVoterIds = new Set(
      players.filter((p) => p.isAlive && !p.idiotSaved && p.id !== room.accusedPlayerId).map((p) => p.id)
    );

    const latestVotesByVoter = new Map<string, string>();
    votes.forEach((v) => {
      if (v.type === 'verdict' && eligibleVoterIds.has(v.voterId)) {
        latestVotesByVoter.set(v.voterId, v.targetId);
      }
    });

    let executeCount = 0;
    let pardonCount = 0;

    latestVotesByVoter.forEach((choice) => {
      if (choice === 'execute') executeCount++;
      if (choice === 'pardon') pardonCount++;
    });

    const totalVotes = executeCount + pardonCount;
    const execute = totalVotes > 0 && executeCount > pardonCount;
    const pct = totalVotes > 0 ? Math.round((executeCount / totalVotes) * 100) : 0;
    const pardonPct = totalVotes > 0 ? Math.round((pardonCount / totalVotes) * 100) : 0;

    const victimName = players.find((p) => p.id === room.accusedPlayerId)?.name || 'Bị cáo';

    let resultSummaryText = '';
    if (totalVotes === 0) {
      resultSummaryText = `Không ai bỏ phiếu biểu quyết. ${victimName} được THA BỔNG (0 trên 0 phiếu)`;
    } else if (execute) {
      resultSummaryText = `Làng đã quyết định TREO CỔ ${victimName} với tỉ lệ ${executeCount} trên ${totalVotes} phiếu (${pct}%)`;
    } else {
      resultSummaryText = `Làng đã quyết định THA BỔNG ${victimName} với tỉ lệ ${pardonCount} trên ${totalVotes} phiếu (${pardonPct}%)`;
    }

    await updateRoomState(room.id, {
      verdictFinished: true,
      verdictResultText: resultSummaryText,
    });

    await handleExecuteVerdict(execute, executeCount, pardonCount, totalVotes);
  };

  // Transition to Night Phase
  const proceedToNight = async (currentPlayersList = players) => {
    await clearNightActionsAndVotes(room.id);
    const nextNightDay = room.dayNumber;
    const validSteps = getValidNightSteps(nextNightDay, room.rolesList, currentPlayersList);
    const firstNightStep = validSteps[0] || 'werewolves';

    await updateRoomState(room.id, {
      status: 'night',
      dayNumber: nextNightDay,
      nightStep: firstNightStep,
      accusedPlayerId: null,
      verdictFinished: false,
      verdictResultText: null,
    });
  };

  // Stuttering Judge Sign Trigger (Used after 1st verdict execution/pardon)
  const handleStutteringJudgeTrigger = async () => {
    if (room.villagePowersLost) return;
    const judge = players.find((p) => p.isAlive && p.role === 'stuttering_judge' && !p.stutteringJudgeUsed);
    if (!judge) return;

    setIsProcessingAction(true);
    try {
      await updatePlayerState(room.id, judge.id, { stutteringJudgeUsed: true });
      await clearNightActionsAndVotes(room.id);

      await updateRoomState(room.id, {
        stutteringJudgeSignActive: false,
        judgeSecondVotingActive: true,
        status: 'day_discussion',
        phaseEndTime: Date.now() + (room.config?.discussionTimeSeconds ? room.config.discussionTimeSeconds * 1000 : 120000),
        accusedPlayerId: null,
        verdictFinished: false,
        verdictResultText: null,
      });

      const judgeMsg = `Làng sẽ tiến hành biểu quyết bổ sung để chọn thêm người bị nghi ngờ là Sói!`;
      announceNarrator(judgeMsg, 'gavel');
      await sendChatMessage(room.id, {
        senderId: 'system',
        senderName: 'Quản Trò',
        content: judgeMsg,
        channel: 'global',
        type: 'system',
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error('Error in handleStutteringJudgeTrigger:', err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Verdict Vote Execution (Round 2 Tally)
  const handleExecuteVerdict = async (
    execute: boolean,
    executeCount: number,
    pardonCount: number,
    totalVotes: number
  ) => {
    if (!room.accusedPlayerId) return;

    await submitNightAction(room.id, {
      actorId: 'system_village',
      actorRole: 'villager',
      targetId: room.accusedPlayerId,
      actionType: execute ? 'village_verdict_execute' : 'village_verdict_pardon',
      dayNumber: room.dayNumber,
    });

    const victim = players.find((p) => p.id === room.accusedPlayerId);
    const pct = totalVotes > 0 ? Math.round((executeCount / totalVotes) * 100) : 0;
    const pardonPct = totalVotes > 0 ? Math.round((pardonCount / totalVotes) * 100) : 0;

    if (execute) {
      await updatePlayerState(room.id, room.accusedPlayerId, {
        isAlive: false,
        deathReason: 'Bị treo cổ',
        deathTiming: `Chết sáng ngày ${room.dayNumber}`,
      });
      soundEffects.playDeathBell();

      if (victim) {
        const execMsg = `Kết quả biểu quyết: Làng đã quyết định treo cổ ${victim.name} với tỉ lệ ${executeCount} trên ${totalVotes} phiếu (${pct}%). Nạn nhân ${victim.name} đã di chuyển vào nhóm chat Tâm linh.`;
        announceNarrator(execMsg, 'death');

        // Elder execution penalty: Villagers lose special powers
        if (victim.role === 'elder') {
          await updateRoomState(room.id, { villagePowersLost: true });
          const elderPenaltyMsg = `⚡ GIÀ LÀNG ${victim.name.toUpperCase()} BỊ DÂN LÀNG TREO CỔ! Các thần linh phẫn nộ: TOÀN BỘ DÂN LÀNG (Tiên Tri, Bảo Vệ, Phù Thủy, Con Cáo, Thợ Săn...) ĐÃ MẤT SẠCH NĂNG LỰC ĐẶC BIỆT!`;
          announceNarrator(elderPenaltyMsg, 'death');
          await sendChatMessage(room.id, {
            senderId: 'system',
            senderName: 'Quản Trò',
            content: elderPenaltyMsg,
            channel: 'global',
            type: 'system',
            createdAt: Date.now(),
          });
        }

        // Trigger death consequences (Lovers, Wild Child, Wolf Cub)
        await handlePlayerDeathConsequences(victim);

        if (victim && victim.role === 'hunter') {
          if (victim.isBot) {
            const aliveTargets = players.filter((p) => p.isAlive && p.id !== victim.id);
            if (aliveTargets.length > 0) {
              const botTarget = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
              await updatePlayerState(room.id, botTarget.id, {
                isAlive: false,
                deathReason: `Bị Thợ Săn ${victim.name} bắn gục`,
                deathTiming: `Chết sáng ngày ${room.dayNumber}`,
              });
              await handlePlayerDeathConsequences(botTarget);
              const hunterMsg = `🎯 THỢ SĂN ${victim.name.toUpperCase()} TRƯỚC KHI BỊ TREO CỔ ĐÃ GIƯƠNG CUNG BẮN GỤC ${botTarget.name.toUpperCase()}!`;
              announceNarrator(hunterMsg, 'death');
              await sendChatMessage(room.id, {
                senderId: 'system',
                senderName: 'Quản Trò',
                content: hunterMsg,
                channel: 'global',
                type: 'system',
                createdAt: Date.now(),
              });
            }
          } else {
            await updateRoomState(room.id, {
              pendingHunterShot: {
                hunterId: victim.id,
                hunterName: victim.name,
                reason: 'Bị treo cổ',
              },
            });
          }
        }
      }
    } else {
      if (victim) {
        const savedMsg = totalVotes === 0
          ? `Kết quả biểu quyết: Do không có ai bỏ phiếu, làng đã quyết định THA BỔNG ${victim.name}.`
          : `Kết quả biểu quyết: Làng đã quyết định THA BỔNG ${victim.name} với tỉ lệ ${pardonCount} trên ${totalVotes} phiếu (${pardonPct}%).`;
        announceNarrator(savedMsg, 'chime');

        await sendChatMessage(room.id, {
          senderId: 'system',
          senderName: 'Quản Trò',
          content: savedMsg,
          channel: 'global',
          type: 'system',
          createdAt: Date.now(),
        });
      }
    }

    // Give time for execution/pardon announcement to complete before checking win or starting night
    setTimeout(async () => {
      // 1. Check Angel (Thiên Thần) Win Condition (Executed on Day 1 / dayNumber === 2)
      if (execute && victim?.role === 'angel' && room.dayNumber === 2) {
        await updateRoomState(room.id, {
          status: 'ended',
          winner: 'angel',
          accusedPlayerId: null,
          verdictFinished: false,
          verdictResultText: null,
        });
        announceNarrator(NARRATOR_SCRIPTS.victoryAnnounce('Thiên Thần đã được dân làng treo cổ ngay trong ngày đầu tiên và giành chiến thắng vinh quang!'), 'victory');
        return;
      }

      const updatedPlayers = players.map((p) =>
        execute && p.id === room.accusedPlayerId
          ? { ...p, isAlive: false, deathReason: 'Bị treo cổ', deathTiming: `Chết sáng ngày ${room.dayNumber}` }
          : p
      );

      // Check win condition after execution announcement finishes
      const alivePlayers = updatedPlayers.filter((p) => p.isAlive);
      const aliveWolves = alivePlayers.filter((p) => {
        const rMeta = ROLE_DEFINITIONS[p.role as RoleType];
        return p.team === 'werewolves' || (rMeta && rMeta.team === 'werewolves');
      });
      const aliveNonWolves = alivePlayers.filter(
        (p) => !aliveWolves.some((w) => w.id === p.id)
      );

      // 2. Check Piper (Người Thổi Sáo) Win Condition
      const alivePiper = alivePlayers.find((p) => p.role === 'piper');
      if (alivePiper) {
        const otherAlive = alivePlayers.filter((p) => p.id !== alivePiper.id);
        const enchantedIds = new Set<string>();
        actions.forEach((a) => {
          if (a.actionType === 'piper_enchant') {
            if (a.targetId) enchantedIds.add(a.targetId);
            if (a.targetIds && Array.isArray(a.targetIds)) a.targetIds.forEach((id) => enchantedIds.add(id));
          }
        });
        if (otherAlive.length === 0 || (otherAlive.length > 0 && otherAlive.every((p) => enchantedIds.has(p.id)))) {
          await updateRoomState(room.id, {
            status: 'ended',
            winner: 'piper',
            accusedPlayerId: null,
            verdictFinished: false,
            verdictResultText: null,
          });
          announceNarrator(NARRATOR_SCRIPTS.victoryAnnounce('Người Thổi Sáo đã thôi miên toàn bộ người còn sống và giành chiến thắng ngoạn mục!'), 'victory');
          return;
        }
      }

      // 3. Check Lovers (Cặp Đôi Tình Yêu) Win Condition
      if (alivePlayers.length === 2) {
        const loverIds = new Set<string>();
        const cupidActions = actions.filter((a) => a.actionType === 'cupid_link');
        cupidActions.forEach((a) => {
          if (a.targetId) loverIds.add(a.targetId);
          if (a.targetIds && Array.isArray(a.targetIds)) a.targetIds.forEach((id) => loverIds.add(id));
        });
        updatedPlayers.forEach((p) => {
          if (p.loverId) loverIds.add(p.id);
        });
        if (loverIds.size > 0 && alivePlayers.every((p) => loverIds.has(p.id))) {
          await updateRoomState(room.id, {
            status: 'ended',
            winner: 'lovers',
            accusedPlayerId: null,
            verdictFinished: false,
            verdictResultText: null,
          });
          announceNarrator(NARRATOR_SCRIPTS.victoryAnnounce('Cặp đôi tình yêu đã cùng nhau vượt qua mọi hiểm nguy và giành chiến thắng chung cuộc!'), 'victory');
          return;
        }
      }

      if (aliveWolves.length === 0 && alivePlayers.length > 0) {
        await updateRoomState(room.id, {
          status: 'ended',
          winner: 'villagers',
          accusedPlayerId: null,
          verdictFinished: false,
          verdictResultText: null,
        });
        announceNarrator(NARRATOR_SCRIPTS.victoryAnnounce('Phe Dân Làng đã tiêu diệt hết Ma Sói và chiến thắng!'), 'victory');
        return;
      } else if (aliveWolves.length === 1 && aliveWolves[0].role === 'white_wolf' && aliveWolves.length >= aliveNonWolves.length) {
        await updateRoomState(room.id, {
          status: 'ended',
          winner: 'white_wolf',
          accusedPlayerId: null,
          verdictFinished: false,
          verdictResultText: null,
        });
        announceNarrator(NARRATOR_SCRIPTS.victoryAnnounce('Sói Trắng đã tiêu diệt hết đồng loại lẫn dân Làng. Độc bá Võ lâm!'), 'howl');
        return;
      } else if (aliveWolves.length >= aliveNonWolves.length && aliveNonWolves.length > 0) {
        await updateRoomState(room.id, {
          status: 'ended',
          winner: 'werewolves',
          accusedPlayerId: null,
          verdictFinished: false,
          verdictResultText: null,
        });
        announceNarrator(NARRATOR_SCRIPTS.victoryAnnounce('Phe Ma Sói áp đảo số lượng và chiến thắng!'), 'howl');
        return;
      }

      // Check if there is an active Judge who hasn't used power and this was vote 1
      const judgePlayer = updatedPlayers.find((p) => p.isAlive && p.role === 'stuttering_judge' && !p.stutteringJudgeUsed);
      const canJudgeVote2 = judgePlayer && !room.judgeSecondVotingActive && !room.villagePowersLost;

      if (canJudgeVote2) {
        if (judgePlayer.isBot) {
          setTimeout(async () => {
            if (Math.random() < 0.7) {
              await handleStutteringJudgeTrigger();
            } else {
              await proceedToNight(updatedPlayers);
            }
          }, 3000);
        } else {
          // Human judge has full control to trigger 2nd vote or Host can advance to Night
          // We also broadcast an attention chime
          soundEffects.playGavelStrike();
        }
      } else {
        await proceedToNight(updatedPlayers);
      }
    }, 5500);
  };

  // Hunter Revenge Shot Handler
  const handleHunterShoot = async (targetId: string) => {
    const targetPlayer = players.find((p) => p.id === targetId);
    if (!targetPlayer || !targetPlayer.isAlive) return;

    const hunterName = room.pendingHunterShot?.hunterName || 'Thợ Săn';

    const timingStr = room.status === 'night' ? `Chết đêm ngày ${room.dayNumber}` : `Chết sáng ngày ${room.dayNumber}`;

    await updatePlayerState(room.id, targetId, {
      isAlive: false,
      deathReason: `Bị Thợ Săn ${hunterName} bắn gục`,
      deathTiming: timingStr,
    });

    // Trigger death consequences (Lovers heartbreak, Wild Child transformation)
    await handlePlayerDeathConsequences(targetPlayer);

    soundEffects.playDeathBell();

    const hunterMsg = `🎯 THỢ SĂN ${hunterName.toUpperCase()} ĐÃ GIƯƠNG CUNG BẮN GỤC ${targetPlayer.name.toUpperCase()} TRƯỚC KHI TRÚT HƠI THỞ CUỐI CÙNG!`;
    announceNarrator(hunterMsg, 'death');

    await sendChatMessage(room.id, {
      senderId: 'system',
      senderName: 'Quản Trò',
      content: hunterMsg,
      channel: 'global',
      type: 'system',
      createdAt: Date.now(),
    });

    // If target player was also a Hunter and not a bot, chain pendingHunterShot
    if (targetPlayer.role === 'hunter' && !targetPlayer.isBot) {
      await updateRoomState(room.id, {
        pendingHunterShot: {
          hunterId: targetPlayer.id,
          hunterName: targetPlayer.name,
          reason: `Bị Thợ Săn ${hunterName} bắn gục`,
        },
      });
    } else {
      await updateRoomState(room.id, { pendingHunterShot: null });
    }
  };

  const handleHunterPass = async () => {
    const hunterName = room.pendingHunterShot?.hunterName || 'Thợ Săn';
    const passMsg = `🕊️ THỢ SĂN ${hunterName.toUpperCase()} ĐÃ QUYẾT ĐỊNH KHÔNG BẮN AI TRƯỚC KHI TỪ GIÃ CÕI ĐỜI!`;
    announceNarrator(passMsg, 'chime');
    await sendChatMessage(room.id, {
      senderId: 'system',
      senderName: 'Quản Trò',
      content: passMsg,
      channel: 'global',
      type: 'system',
      createdAt: Date.now(),
    });
    await updateRoomState(room.id, { pendingHunterShot: null });
  };

  // ----------------------------------------------------
  // CONSENSUS / READY SIGNAL MECHANISM FOR THE 3 BUTTONS
  // ----------------------------------------------------

  // Ref guard for Host processing
  const isProcessingHostConsensusRef = useRef(false);

  // 1. Action 1: Early Voting ("Bỏ Phiếu Sớm" in day_discussion)
  const earlyVoteEligible = players.filter((p) => p.isAlive);
  const earlyVoteHumans = earlyVoteEligible.filter((p) => !p.isBot);
  const earlyVoteTotal = earlyVoteEligible.length;
  const earlyVoteBotCount = earlyVoteEligible.filter((p) => p.isBot).length;
  const earlyVoteHumanReady = votes.filter(
    (v) => v.type === 'early_vote_ready' && earlyVoteHumans.some((p) => p.id === v.voterId)
  );
  const earlyVoteCount = earlyVoteTotal > 0 ? Math.min(earlyVoteTotal, earlyVoteBotCount + earlyVoteHumanReady.length) : 0;
  const hasEarlyVoteReady = votes.some((v) => v.voterId === currentPlayer.id && v.type === 'early_vote_ready');
  const isEarlyVoteConsensusReached =
    earlyVoteHumans.length > 0
      ? earlyVoteHumanReady.length === earlyVoteHumans.length
      : votes.some((v) => v.type === 'early_vote_ready');

  const handleToggleEarlyVoteReady = async () => {
    if ((!isAlive && earlyVoteHumans.length > 0) || isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      if (hasEarlyVoteReady) {
        await submitVote(room.id, {
          voterId: currentPlayer.id,
          targetId: 'unready',
          type: 'early_vote_ready',
        });
      } else {
        await submitVote(room.id, {
          voterId: currentPlayer.id,
          targetId: 'ready',
          type: 'early_vote_ready',
        });
        if (isEarlyVotingModalOpen) {
          setIsEarlyVotingModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Error toggling early vote ready:', err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 2. Action 2: Tally Votes ("Chốt Bỏ Phiếu" in day_voting)
  const tallyEligible = players.filter((p) => p.isAlive && !p.idiotSaved);
  const tallyHumans = tallyEligible.filter((p) => !p.isBot);
  const tallyTotal = tallyEligible.length;
  const tallyBotCount = tallyEligible.filter((p) => p.isBot).length;
  const tallyHumanReady = votes.filter(
    (v) => v.type === 'tally_ready' && tallyHumans.some((p) => p.id === v.voterId)
  );
  const tallyCount = tallyTotal > 0 ? Math.min(tallyTotal, tallyBotCount + tallyHumanReady.length) : 0;
  const hasTallyReady = votes.some((v) => v.voterId === currentPlayer.id && v.type === 'tally_ready');
  const dayNominateVotes = votes.filter((v) => v.type === 'nominate');
  const isTallyConsensusReached =
    tallyHumans.length > 0
      ? tallyHumanReady.length === tallyHumans.length
      : votes.some((v) => v.type === 'tally_ready') || dayNominateVotes.length >= tallyEligible.length;

  const handleToggleTallyReady = async () => {
    if ((!isAlive && tallyHumans.length > 0) || currentPlayer.idiotSaved || isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      if (hasTallyReady) {
        await submitVote(room.id, {
          voterId: currentPlayer.id,
          targetId: 'unready',
          type: 'tally_ready',
        });
      } else {
        await submitVote(room.id, {
          voterId: currentPlayer.id,
          targetId: 'ready',
          type: 'tally_ready',
        });
      }
    } catch (err) {
      console.error('Error toggling tally ready:', err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 3. Action 3: Verdict Tally ("Chốt Phán Quyết" in day_verdict)
  const verdictTallyEligible = players.filter(
    (p) => p.isAlive && !p.idiotSaved && p.id !== room.accusedPlayerId
  );
  const verdictTallyHumans = verdictTallyEligible.filter((p) => !p.isBot);
  const verdictTallyTotal = verdictTallyEligible.length;
  const verdictTallyBotCount = verdictTallyEligible.filter((p) => p.isBot).length;
  const verdictTallyHumanReady = votes.filter(
    (v) => v.type === 'verdict_tally_ready' && verdictTallyHumans.some((p) => p.id === v.voterId)
  );
  const verdictTallyCount =
    verdictTallyTotal > 0
      ? Math.min(verdictTallyTotal, verdictTallyBotCount + verdictTallyHumanReady.length)
      : 0;
  const hasVerdictTallyReady = votes.some(
    (v) => v.voterId === currentPlayer.id && v.type === 'verdict_tally_ready'
  );
  const verdictVotesCast = votes.filter((v) => v.type === 'verdict');
  const isVerdictTallyConsensusReached =
    verdictTallyHumans.length > 0
      ? verdictTallyHumanReady.length === verdictTallyHumans.length
      : votes.some((v) => v.type === 'verdict_tally_ready') || verdictVotesCast.length >= verdictTallyEligible.length;

  const handleToggleVerdictTallyReady = async () => {
    if (
      (!isAlive && verdictTallyHumans.length > 0) ||
      currentPlayer.idiotSaved ||
      currentPlayer.id === room.accusedPlayerId ||
      isProcessingAction
    )
      return;
    setIsProcessingAction(true);
    try {
      if (hasVerdictTallyReady) {
        await submitVote(room.id, {
          voterId: currentPlayer.id,
          targetId: 'unready',
          type: 'verdict_tally_ready',
        });
      } else {
        await submitVote(room.id, {
          voterId: currentPlayer.id,
          targetId: 'ready',
          type: 'verdict_tally_ready',
        });
      }
    } catch (err) {
      console.error('Error toggling verdict tally ready:', err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Host consensus safeguard & auto phase transition
  useEffect(() => {
    if (!isHost) return;

    if (room.status === 'day_discussion' && isEarlyVoteConsensusReached) {
      const timer = setTimeout(async () => {
        if (isProcessingHostConsensusRef.current) return;
        isProcessingHostConsensusRef.current = true;
        try {
          setIsEarlyVotingModalOpen(false);
          const votingMs = (room.config?.votingTimeSeconds || 30) * 1000;
          await clearNightActionsAndVotes(room.id);
          await updateRoomState(room.id, {
            status: 'day_voting',
            phaseEndTime: Date.now() + votingMs,
          });
        } finally {
          isProcessingHostConsensusRef.current = false;
        }
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (room.status === 'day_voting' && isTallyConsensusReached) {
      const timer = setTimeout(async () => {
        if (isProcessingHostConsensusRef.current) return;
        isProcessingHostConsensusRef.current = true;
        try {
          await handleTallyVotes();
        } finally {
          isProcessingHostConsensusRef.current = false;
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (
      room.status === 'day_verdict' &&
      !room.verdictFinished &&
      isVerdictTallyConsensusReached
    ) {
      const timer = setTimeout(async () => {
        if (isProcessingHostConsensusRef.current) return;
        isProcessingHostConsensusRef.current = true;
        try {
          await handleTallyVerdict();
        } finally {
          isProcessingHostConsensusRef.current = false;
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [
    isHost,
    room.status,
    room.verdictFinished,
    room.accusedPlayerId,
    isEarlyVoteConsensusReached,
    isTallyConsensusReached,
    isVerdictTallyConsensusReached,
    verdictTallyHumans.length,
  ]);

  return (
    <div id="game-board-container" className="w-full max-w-6xl mx-auto p-2 sm:p-4 space-y-3 sm:space-y-4 overflow-x-hidden">
      {/* Game Status & Phase Banner */}
      <div className={`p-3 sm:p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 shadow-xl transition-all max-w-full overflow-hidden ${
        isNight
          ? 'bg-gradient-to-r from-slate-950 via-purple-950 to-slate-950 border-purple-500/40 text-purple-200'
          : 'bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-amber-500/40 text-amber-100'
      }`}>
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 w-full flex-1">
          <div className="p-2 sm:p-3 rounded-xl bg-slate-900 border border-white/10 shadow-inner shrink-0">
            {isNight ? <Moon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 animate-pulse" /> : <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 animate-spin" />}
          </div>
          <div className="min-w-0 flex-1 w-full">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full">
              <span className="font-serif font-black text-base sm:text-lg tracking-wide whitespace-nowrap">
                {isNight
                  ? (room.dayNumber <= 1 ? 'ĐÊM THỨ NHẤT' : `ĐÊM THỨ ${room.dayNumber}`)
                  : `SÁNG NGÀY ${room.dayNumber}`}
              </span>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-slate-900/80 border border-white/10 font-mono font-bold whitespace-nowrap">
                PHASE: {room.status.toUpperCase()}
              </span>
              {room.status === 'day_discussion' && (
                <div
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] sm:text-xs font-mono font-bold shadow-inner transition-all whitespace-nowrap ${
                    phaseTimeLeft <= 10
                      ? 'bg-rose-500/30 border-rose-400 text-rose-200 animate-pulse ring-2 ring-rose-500/50'
                      : 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                  }`}
                  title={`Thời gian thảo luận: ${Math.round(((room.config?.discussionTimeSeconds || 180) / 60) * 10) / 10} phút`}
                >
                  <Clock className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${phaseTimeLeft <= 10 ? 'text-rose-400 animate-bounce' : 'text-amber-400 animate-spin'}`} />
                  <span>
                    Thảo luận: {Math.floor(phaseTimeLeft / 60).toString().padStart(2, '0')}:{(phaseTimeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
              {room.status === 'day_defense' && (
                <div
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] sm:text-xs font-mono font-bold shadow-inner transition-all whitespace-nowrap ${
                    phaseTimeLeft <= 10
                      ? 'bg-rose-500/30 border-rose-400 text-rose-200 animate-pulse ring-2 ring-rose-500/50'
                      : 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                  }`}
                  title="Thời gian biện hộ"
                >
                  <Clock className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${phaseTimeLeft <= 10 ? 'text-rose-400 animate-bounce' : 'text-amber-400 animate-spin'}`} />
                  <span>
                    Biện hộ: {Math.floor(phaseTimeLeft / 60).toString().padStart(2, '0')}:{(phaseTimeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 break-words leading-relaxed w-full">{narratorMessage}</p>
          </div>
        </div>

        {/* Game Control Buttons */}
        <div className="flex items-center justify-start md:justify-end gap-2 shrink-0 flex-wrap">
          {isNight && canAdvanceNight && (
            <button
              onClick={handleAdvanceNightStep}
              disabled={isProcessingAction}
              className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow-lg transition-all flex items-center gap-1.5 border disabled:opacity-50 ${
                isMyActiveNightStep
                  ? 'bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 border-amber-300 ring-2 ring-amber-400 shadow-amber-500/50 animate-pulse'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-400/40 hover:from-purple-500 hover:to-indigo-500'
              }`}
            >
              {isProcessingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>
                {isMyActiveNightStep ? '⚡ BẤM CHỐT' : 'Tiếp Theo'} ({room.nightStep}) ➔
              </span>
            </button>
          )}

          {isHost && (
            <>
              {room.status === 'lobby' && (
                <button
                  onClick={handleStartMatch}
                  disabled={isProcessingAction}
                  className={`px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-lg hover:from-emerald-500 hover:to-teal-500 transition-all border border-emerald-400/30 flex items-center gap-1.5 ${
                    isProcessingAction ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isProcessingAction ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Đang khởi tạo...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" /> Bắt Đầu Trận Đấu
                    </>
                  )}
                </button>
              )}

            {room.status === 'day_announcement' && isHost && (
              <button
                onClick={() =>
                  updateRoomState(room.id, {
                    status: 'day_discussion',
                    phaseEndTime: Date.now() + (room.config?.discussionTimeSeconds || 180) * 1000,
                  })
                }
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg flex items-center gap-1 disabled:opacity-50"
              >
                {isProcessingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Bắt Đầu Bàn Luận
              </button>
            )}

            {room.status === 'day_discussion' && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleToggleEarlyVoteReady}
                  disabled={isProcessingAction || (!isAlive && earlyVoteHumans.length > 0)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs shadow-lg flex items-center gap-1.5 border transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
                    hasEarlyVoteReady
                      ? 'bg-emerald-600 border-emerald-400 text-white ring-2 ring-emerald-500/50'
                      : 'bg-gradient-to-r from-amber-600 via-rose-600 to-rose-700 hover:from-amber-500 hover:to-rose-600 text-white border-amber-400/40'
                  }`}
                >
                  {isProcessingAction ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : hasEarlyVoteReady ? (
                    <CheckCircle className="w-3.5 h-3.5 text-amber-300" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {hasEarlyVoteReady ? '✓ Đã Đồng Ý' : 'Bỏ Phiếu Sớm'}{' '}
                    ({earlyVoteCount}/{earlyVoteTotal} người chơi)
                  </span>
                </button>
              </div>
            )}

            {room.status === 'day_defense' && (
              <button
                onClick={() => updateRoomState(room.id, { status: 'day_verdict' })}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg flex items-center gap-1 disabled:opacity-50"
              >
                {isProcessingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Đưa Ra Quyết Định Cuối Cùng
              </button>
            )}
            </>
          )}
        </div>
      </div>

      {/* Interactive Action & Voting Panel (Placed immediately below Phase Banner for convenient access) */}
      {/* 0. Day Defense Interactive Panel */}
      {room.status === 'day_defense' && (() => {
        const accusedPlayer = players.find((p) => p.id === room.accusedPlayerId);
        const isAccused = currentPlayer.id === room.accusedPlayerId;

        return (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-amber-950/60 to-slate-950 border border-amber-500/50 space-y-3.5 text-center shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-center gap-2 text-amber-300 font-serif font-bold text-sm sm:text-base">
              <Megaphone className="w-5 h-5 text-amber-400 animate-pulse" />
              <span>BỤC BIỆN HỘ DÂN LÀNG</span>
            </div>

            <div className="flex items-center justify-center gap-3 py-1">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-900 border-2 border-amber-400/60 flex items-center justify-center text-2xl shadow-lg ring-2 ring-amber-500/30 shrink-0">
                {accusedPlayer?.avatar || '👤'}
              </div>
              <div className="text-left">
                <div className="text-sm sm:text-base font-extrabold text-amber-200">
                  {accusedPlayer?.name || 'Bị Cáo Nghi Ngờ'}
                </div>
                <span className="text-xs text-slate-300 font-medium">
                  Đang trình bày lời bào chữa trước toàn thể dân làng...
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              {isAccused
                ? '👉 BẠN ĐANG TRÊN BỤC BIỆN HỘ! Hãy dùng Khung Chat hoặc Micro (Push-To-Talk) để giải trình và chứng minh sự trong sạch của mình với dân làng.'
                : `Lắng nghe lời biện hộ từ ${accusedPlayer?.name || 'bị cáo'}. Bạn sẽ bỏ phiếu Treo Cổ hoặc Tha Bổng ở bước tiếp theo.`}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              {isAccused && (
                <button
                  onClick={() => updateRoomState(room.id, { status: 'day_verdict', phaseEndTime: null })}
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 border border-amber-400/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {isProcessingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 text-amber-200" />}
                  <span>✓ Hoàn Tất Biện Hộ (Chuyển sang Phán Quyết)</span>
                </button>
              )}

              {(!isAccused || isHost) && (
                <button
                  onClick={() => updateRoomState(room.id, { status: 'day_verdict', phaseEndTime: null })}
                  disabled={isProcessingAction}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 font-bold text-xs border border-amber-500/30 transition-all flex items-center gap-1.5 hover:scale-105 disabled:opacity-50"
                >
                  {isProcessingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gavel className="w-3.5 h-3.5 text-amber-400" />}
                  <span>Chuyển Sang Vòng Phán Quyết ➔</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* 1. Day Verdict Decision Panel */}
      {room.status === 'day_verdict' && (() => {
        const aliveJudge = players.find((p) => p.isAlive && p.role === 'stuttering_judge' && !p.stutteringJudgeUsed);
        const canJudgeRequestSecondVote = aliveJudge && !room.judgeSecondVotingActive && !room.villagePowersLost;

        if (room.verdictFinished) {
          return (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950/80 to-slate-950 border border-indigo-500/50 space-y-4 text-center shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-center gap-2 text-amber-300 font-serif font-bold text-sm sm:text-base">
                <Gavel className="w-5 h-5 text-amber-400" />
                <span>KẾT QUẢ PHÁN QUYẾT</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 text-rose-200 font-bold text-sm sm:text-base shadow-inner">
                {room.verdictResultText || 'Đã chốt kết quả bỏ phiếu phán quyết!'}
              </div>

              {canJudgeRequestSecondVote ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/90 via-purple-950/90 to-slate-950 border-2 border-amber-400/60 shadow-2xl space-y-3 mt-2 text-center animate-pulse">
                  <div className="flex items-center justify-center gap-2 text-amber-300 font-serif font-bold text-sm sm:text-base">
                    <Gavel className="w-5 h-5 text-amber-300 animate-bounce" />
                    <span>TÍN HIỆU QUAN TÒA LẮP BẮP</span>
                  </div>

                  <p className="text-xs sm:text-sm text-indigo-100 font-medium">
                    {currentPlayer.role === 'stuttering_judge' && currentPlayer.isAlive && !currentPlayer.stutteringJudgeUsed
                      ? 'Nạn nhân trước đó đã được xử lý! Bạn có muốn kích hoạt phiên BỎ PHIẾU LẦN 2 cho dân làng ngay bây giờ không?'
                      : 'Nạn nhân trước đó đã được xử lý. Đang chờ Quan Tòa Lắp Bắp ra tín hiệu biểu quyết lần 2...'}
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    {currentPlayer.role === 'stuttering_judge' && currentPlayer.isAlive && !currentPlayer.stutteringJudgeUsed && (
                      <button
                        onClick={handleStutteringJudgeTrigger}
                        disabled={isProcessingAction}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 border border-purple-400/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                      >
                        <Gavel className="w-4 h-4 text-amber-300 animate-bounce" />
                        <span>YÊU CẦU BỎ PHIẾU LẦN 2</span>
                      </button>
                    )}

                    {(isHost || (currentPlayer.role === 'stuttering_judge' && currentPlayer.isAlive)) && (
                      <button
                        onClick={() => proceedToNight()}
                        disabled={isProcessingAction}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-white/10 transition-all"
                      >
                        <span>🌙 Bỏ Qua — Chuyển Sang Màn Đêm</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic font-mono animate-pulse pt-1">
                  ⏳ Đang xử lý biến cố & chuyển tiếp sang Màn Đêm tiếp theo...
                </p>
              )}
            </div>
          );
        }

        const verdictVotes = votes.filter((v) => v.type === 'verdict');
        const executeCount = verdictVotes.filter((v) => v.targetId === 'execute').length;
        const pardonCount = verdictVotes.filter((v) => v.targetId === 'pardon').length;
        const myVote = verdictVotes.find((v) => v.voterId === currentPlayer.id);

        return (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-rose-950/50 to-slate-950 border border-rose-500/50 space-y-3 text-center shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-center gap-2 text-rose-300 font-serif font-bold text-sm sm:text-base">
              <Gavel className="w-5 h-5 text-rose-400" />
              <span>PHIÊN TÒA DÂN LÀNG - PHIẾU BẦU LẦN 2</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Bị cáo chính:{' '}
              <strong className="text-amber-300 font-bold">
                {players.find((p) => p.id === room.accusedPlayerId)?.name || 'Bị Cáo Nghi Ngờ'}
              </strong>
              . Hãy đưa ra phán quyết cuối cùng!
            </p>

            <div className="flex flex-col items-center justify-center gap-3 pt-1">
              {isAlive && !currentPlayer.idiotSaved && (
                <div className="space-y-3 w-full max-w-md mx-auto">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => handleCastVerdictVote('execute')}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center gap-1.5 border ${
                        myVote?.targetId === 'execute'
                          ? 'bg-rose-600 border-rose-300 ring-2 ring-rose-400 text-white scale-105 shadow-rose-900/80 font-extrabold'
                          : 'bg-rose-950/80 hover:bg-rose-900 border-rose-700/60 text-rose-200 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <Skull className="w-4 h-4" /> 🗡️ Treo Cổ
                    </button>
                    <button
                      onClick={() => handleCastVerdictVote('pardon')}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center gap-1.5 border ${
                        myVote?.targetId === 'pardon'
                          ? 'bg-emerald-600 border-emerald-300 ring-2 ring-emerald-400 text-white scale-105 shadow-emerald-900/80 font-extrabold'
                          : 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-700/60 text-emerald-200 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <Shield className="w-4 h-4" /> 🛡️ Tha Bổng
                    </button>
                  </div>

                  {myVote ? (
                    <p className="text-xs text-amber-200/90 font-medium flex items-center justify-center gap-1.5 pt-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        Lựa chọn hiện tại:{' '}
                        <strong className={myVote.targetId === 'execute' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {myVote.targetId === 'execute' ? '🗡️ Treo Cổ' : '🛡️ Tha Bổng'}
                        </strong>
                        . Bạn vẫn có thể bấm nút còn lại để thay đổi trước khi chốt.
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Hãy nhấp vào một trong hai biểu quyết ở trên để đưa ra lựa chọn của bạn.
                    </p>
                  )}
                </div>
              )}

              {isAlive && currentPlayer.idiotSaved && (
                <p className="text-xs text-amber-300 font-bold bg-amber-950/60 p-2.5 rounded-xl border border-amber-500/30">
                  🤡 Bạn đã lộ diện là Thằng Ngốc và được tha chết. Bạn không còn quyền bỏ phiếu.
                </p>
              )}

              {!isAlive && (
                <p className="text-xs text-slate-400 italic font-mono pt-1">
                  👻 Bạn đã chết và đang quan sát phiên tòa. Dân làng còn sống đang bỏ phiếu phán quyết...
                </p>
              )}

              {/* Tally verdict button for all eligible voters */}
              {(isAlive || verdictTallyHumans.length === 0) && !currentPlayer.idiotSaved && currentPlayer.id !== room.accusedPlayerId && (
                <div className="pt-2 border-t border-slate-800/80 w-full flex justify-center">
                  <button
                    onClick={handleToggleVerdictTallyReady}
                    disabled={isProcessingAction || (!isAlive && verdictTallyHumans.length > 0)}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 border transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
                      hasVerdictTallyReady
                        ? 'bg-emerald-600 border-emerald-400 text-white ring-2 ring-emerald-500/50'
                        : 'bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white border-rose-400/40'
                    }`}
                  >
                    {isProcessingAction ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : hasVerdictTallyReady ? (
                      <CheckCircle className="w-4 h-4 text-amber-300" />
                    ) : (
                      <Gavel className="w-4 h-4 text-amber-300" />
                    )}
                    <span>
                      {hasVerdictTallyReady ? '✓ Đã Chốt Phán Quyết' : 'Chốt Phán Quyết'}{' '}
                      ({verdictTallyCount}/{verdictTallyTotal} người chơi)
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 2. Day Voting Interactive Banner */}
      {room.status === 'day_voting' && (
        <div className="p-3.5 rounded-2xl bg-purple-950/80 border border-purple-500/50 text-purple-200 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-900/80 border border-purple-400/40 text-amber-300 shrink-0">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <div className="font-serif font-bold text-amber-300 text-sm sm:text-base">BỎ PHIẾU KÍN CỦA DÂN LÀNG</div>
              <span className="text-slate-300 text-xs">
                {currentPlayer.idiotSaved ? (
                  <strong className="text-amber-300 font-bold">
                    🤡 Bạn đã lộ diện là Thằng Ngốc và được tha chết. Bạn không thể bỏ phiếu hoặc bị chọn!
                  </strong>
                ) : (
                  'Nhấp chọn 1 người chơi trong danh sách bên dưới để bỏ phiếu. Bạn có thể tự do thay đổi lựa chọn trước khi chốt.'
                )}
              </span>
            </div>
          </div>
          {(isAlive || tallyHumans.length === 0) && !currentPlayer.idiotSaved && (
            <button
              onClick={handleToggleTallyReady}
              disabled={isProcessingAction || (!isAlive && tallyHumans.length > 0)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg shrink-0 flex items-center gap-1.5 border hover:scale-105 active:scale-95 transition-all disabled:opacity-50 ${
                hasTallyReady
                  ? 'bg-emerald-600 border-emerald-400 text-white ring-2 ring-emerald-500/50'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white border-rose-400/40'
              }`}
            >
              {isProcessingAction ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : hasTallyReady ? (
                <CheckCircle className="w-4 h-4 text-amber-300" />
              ) : (
                <Gavel className="w-4 h-4 text-amber-300" />
              )}
              <span>
                {hasTallyReady ? '✓ Đã Chốt Phiếu' : 'Chốt Bỏ Phiếu'}{' '}
                ({tallyCount}/{tallyTotal} người chơi)
              </span>
            </button>
          )}
        </div>
      )}

      {/* 2.5 NIGHT STEP INTERACTIVE BANNERS */}
      {isNight && (
        <div className="space-y-3">
          {/* A. WEREWOLF NIGHT PANEL */}
          {room.nightStep === 'werewolves' && (
            <div className="p-4 rounded-2xl bg-rose-950/90 border border-rose-600/60 shadow-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-rose-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🐺</span>
                  <div>
                    <h3 className="font-serif font-bold text-rose-200 text-sm sm:text-base">
                      HỘI ĐỒNG MA SÓI — CÙNG THỐNG NHẤT CON MỒI (ĐÊM THỨ {room.dayNumber})
                    </h3>
                    <p className="text-xs text-rose-300/90">
                      Các Ma Sói cùng bàn bạc và biểu quyết chọn 1 con mồi để tiêu diệt đêm nay.
                    </p>
                  </div>
                </div>
              </div>

              {isCurrentPlayerWolf ? (
                <div className="space-y-3 pt-1">
                  {/* Living Werewolves voting status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {players
                      .filter((p) => p.isAlive && (p.role.includes('wolf') || p.team === 'werewolves'))
                      .map((wolf) => {
                        const wolfAction = actions.find(
                          (a) => a.actorId === wolf.id && a.actionType === 'wolf_bite' && a.dayNumber === room.dayNumber
                        );
                        const targetPlayer = wolfAction ? players.find((p) => p.id === wolfAction.targetId) : null;

                        return (
                          <div
                            key={wolf.id}
                            className="p-2 rounded-xl bg-slate-900/90 border border-rose-500/30 flex items-center gap-2 text-xs"
                          >
                            <span className="text-base">{wolf.avatar}</span>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-white truncate">
                                {wolf.name} {wolf.id === currentPlayer.id ? '(Bạn)' : ''}
                              </div>
                              <div className="text-[11px] text-rose-300 truncate font-medium">
                                🎯 {targetPlayer ? targetPlayer.name : 'Chưa chọn'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Top Wolf Target Tally */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎯</span>
                      <div>
                        <span className="text-slate-300">Con Mồi Bị Sói Chọn Nhiều Nhất: </span>
                        {tonightWolfStatus.victim ? (
                          <strong className="text-amber-300 font-bold text-sm sm:text-base">
                            {tonightWolfStatus.victim.name}
                          </strong>
                        ) : tonightWolfStatus.isTie ? (
                          <span className="text-amber-400 font-bold italic">
                            ⚖️ {tonightWolfStatus.message}
                          </span>
                        ) : (
                          <span className="text-rose-400 italic font-semibold">
                            {tonightWolfStatus.message}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/80 text-center text-xs text-slate-300 italic">
                  💤 Dân làng đang chìm vào giấc ngủ sâu... Ma Sói đang rình rập và thống nhất con mồi trong bóng tối.
                </div>
              )}
            </div>
          )}

          {/* CURSE WOLF NIGHT PANEL */}
          {room.nightStep === 'curse_wolf' && (
            <div className="p-4 rounded-2xl bg-rose-950/90 border border-rose-500/60 shadow-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 border-b border-rose-800/80 pb-2">
                <span className="text-xl">🔮</span>
                <div>
                  <h3 className="font-serif font-bold text-rose-200 text-sm sm:text-base">
                    SÓI NGUYỀN THỨC GIẤC — LỜI NGUYỀN HUYỀN BÍ (ĐÊM THỨ {room.dayNumber})
                  </h3>
                  <p className="text-xs text-rose-300/90">
                    Sói Nguyền có khả năng tung ra lời nguyền vào nạn nhân bị Sói cắn đêm nay để biến họ thành Ma Sói mới. Khả năng này chỉ dùng 1 LẦN duy nhất trong toàn bộ ván đấu.
                  </p>
                </div>
              </div>

              {currentPlayer.role === 'curse_wolf' ? (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-rose-500/30 space-y-2 text-xs">
                  {hasUsedCurseWolfInPast ? (
                    <p className="text-slate-400 italic py-1">
                      🔴 Bạn đã sử dụng lời Nguyền ở đêm trước rồi. Khả năng này đã hết lượt!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-slate-200">
                        🔴 Nạn nhân bị Ma Sói cắn đêm nay:{' '}
                        {tonightWolfBitePlayer ? (
                          <strong className="text-amber-300 font-bold text-sm">{tonightWolfBitePlayer.name}</strong>
                        ) : (
                          <span className="text-rose-400 italic">Phe Ma Sói chưa chọn con mồi</span>
                        )}
                      </p>
                      {tonightWolfBitePlayer && (
                        <button
                          onClick={handleToggleCurseWolf}
                          className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 border ${
                            isCurseActiveTonight
                              ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-300 ring-2 ring-rose-400 animate-pulse'
                              : 'bg-purple-700 hover:bg-purple-600 text-white border-purple-400'
                          }`}
                        >
                          {isCurseActiveTonight ? (
                            <><span>🔮</span> Đang dùng LỜI NGUYỀN {tonightWolfBitePlayer.name} (Bấm để HỦY)</>
                          ) : (
                            <><span>✨</span> Dùng Lời Nguyền Biến {tonightWolfBitePlayer.name} Thành Ma Sói</>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/80 text-center text-xs text-slate-300 italic">
                  💤 Dân làng đang ngủ say... Sói Nguyền đang đắn đo có nên tung lời nguyền ma thuật hay không.
                </div>
              )}
            </div>
          )}

          {/* WHITE WOLF NIGHT PANEL */}
          {room.nightStep === 'white_wolf' && (
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-500/60 shadow-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <span className="text-xl">🐺</span>
                <div>
                  <h3 className="font-serif font-bold text-slate-100 text-sm sm:text-base">
                    SÓI TRẮNG THỨC GIẤC — BẢN NĂNG ĐỒNG LOẠI (ĐÊM THỨ {room.dayNumber})
                  </h3>
                  <p className="text-xs text-slate-300">
                    Sói Trắng thức dậy riêng váo các đêm chẵn (các đêm 2, 4, 6...) và có quyền tiêu diệt 1 con Sói khác trong bầy để trở thành kẻ sống sót duy nhất.
                  </p>
                </div>
              </div>

              {currentPlayer.role === 'white_wolf' ? (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-500/30 space-y-2 text-xs">
                  <p className="text-slate-200">
                    ⚪ Mục tiêu Sói Trắng chọn cắn đêm nay:{' '}
                    {(() => {
                      const whiteWolfAction = actions.find(
                        (a) => a.actorId === currentPlayer.id && a.actionType === 'white_wolf_kill' && a.dayNumber === room.dayNumber
                      );
                      const tPlayer = players.find((p) => p.id === whiteWolfAction?.targetId);
                      return tPlayer ? (
                        <strong className="text-rose-400 font-bold text-sm">{tPlayer.name}</strong>
                      ) : (
                        <span className="text-slate-400 italic">Chưa chọn (Nhấp chọn 1 Ma Sói bên dưới)</span>
                      );
                    })()}
                  </p>
                  <p className="text-[11px] text-slate-400 italic">
                    💡 Nhấp chọn 1 con Ma Sói khác bên dưới để hạ sát hoặc bỏ qua, không hạ sát con sói nào đêm nay.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/80 text-center text-xs text-slate-300 italic">
                  💤 Đêm lạnh buốt... Sói Trắng âm thầm quan sát các đồng bầy trong bóng tối.
                </div>
              )}
            </div>
          )}

          {/* DIRE WOLF NIGHT PANEL */}
          {room.nightStep === 'dire_wolf' && (
            <div className="p-4 rounded-2xl bg-red-950/90 border border-red-500/60 shadow-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 border-b border-red-800/80 pb-2">
                <span className="text-xl">🐺</span>
                <div>
                  <h3 className="font-serif font-bold text-red-100 text-sm sm:text-base">
                    SÓI HÙM THỨC GIẤC — CẮN THÊM CON MỒI (ĐÊM THỨ {room.dayNumber})
                  </h3>
                  <p className="text-xs text-red-300">
                    Vì chưa có con Sói nào trong bầy bị tiêu diệt, Sói Hùm có đặc quyền thức dậy riêng và cắn thêm 1 dân làng nữa đêm nay!
                  </p>
                </div>
              </div>

              {currentPlayer.role === 'dire_wolf' ? (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-red-500/30 space-y-2 text-xs">
                  <p className="text-slate-200">
                    🔴 Con mồi thứ 2 Sói Hùm chọn cắn đêm nay:{' '}
                    {(() => {
                      const direWolfAction = actions.find(
                        (a) => a.actorId === currentPlayer.id && a.actionType === 'dire_wolf_kill' && a.dayNumber === room.dayNumber
                      );
                      const tPlayer = players.find((p) => p.id === direWolfAction?.targetId);
                      return tPlayer ? (
                        <strong className="text-amber-300 font-bold text-sm">{tPlayer.name}</strong>
                      ) : (
                        <span className="text-slate-400 italic">Chưa chọn (Nhấp chọn 1 Dân làng bên dưới)</span>
                      );
                    })()}
                  </p>
                  <p className="text-[11px] text-slate-400 italic">
                    💡 Nhấp chọn 1 Dân làng bên dưới để chọn làm nạn nhân thứ 2 hoặc nhấp lại để bỏ chọn.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/80 text-center text-xs text-slate-300 italic">
                  💤 Tiếng hú kinh hãi xé tan màn đêm... Sói Hùm đang đi săn lùng nạn nhân tiếp theo.
                </div>
              )}
            </div>
          )}

          {/* B. WITCH NIGHT PANEL */}
          {room.nightStep === 'witch' && (
            <div className="p-4 rounded-2xl bg-purple-950/90 border border-purple-500/60 shadow-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 border-b border-purple-800/80 pb-2">
                <span className="text-xl">🧪</span>
                <div>
                  <h3 className="font-serif font-bold text-amber-300 text-sm sm:text-base">
                    PHÙ THỦY THỨC GIẤC — ĐIỀU CHẾ MA THUẬT (ĐÊM THỨ {room.dayNumber})
                  </h3>
                  <p className="text-xs text-purple-200">
                    Phù thủy sở hữu 2 bình thuốc: độc dược và giải dược. Mỗi bình thuốc chỉ sử dụng tối đa 1 LẦN duy nhất trong toàn bộ ván đấu.
                  </p>
                </div>
              </div>

              {room.villagePowersLost ? (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600/50 text-rose-200 text-xs font-bold">
                  ⚡ Dân làng đã hại chết Già Làng! Phù Thủy đã mất toàn bộ khả năng sử dụng ma thuật.
                </div>
              ) : currentPlayer.role === 'witch' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* 1. BÌNH THUỐC CỨU */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                        <span>💊</span> Bình GIẢI DƯỢC (Cứu Nạn Nhân Sói Cắn)
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        hasUsedHealInPast ? 'bg-rose-950 text-rose-300 border border-rose-700/50' : 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                      }`}>
                        {hasUsedHealInPast ? 'Đã dùng (Hết lượt)' : 'Còn 1 lượt'}
                      </span>
                    </div>

                    {hasUsedHealInPast ? (
                      <p className="text-xs text-slate-400 italic py-1">
                        🔴 Bạn đã sử dụng GIẢI DƯỢC ở đêm trước. Thuốc này đã cạn sạch!
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-300">
                          ✨ Phù Thủy không được biết ai bị Sói cắn. Nếu bật bình thuốc, phép thuật sẽ tự động bảo vệ nạn nhân bị Ma Sói cắn đêm nay.
                        </p>
                        <button
                          onClick={handleToggleWitchHeal}
                          className={`w-full py-2 px-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 border ${
                            isHealActiveTonight
                              ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-300 ring-2 ring-rose-400 animate-pulse'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-300'
                          }`}
                        >
                          {isHealActiveTonight ? (
                            <><span>💊</span> Đang BẬT GIẢI DƯỢC (Bấm để HỦY)</>
                          ) : (
                            <><span>💊</span> Dùng GIẢI DƯỢC Đêm Nay</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2. BÌNH THUỐC ĐỘC */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                        <span>🧪</span> Bình ĐỘC DƯỢC (Hạ Độc 1 Người)
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        hasUsedPoisonInPast ? 'bg-rose-950 text-rose-300 border border-rose-700/50' : 'bg-purple-950 text-purple-300 border border-purple-700/50'
                      }`}>
                        {hasUsedPoisonInPast ? 'Đã dùng (Hết lượt)' : 'Còn 1 lượt'}
                      </span>
                    </div>

                    {hasUsedPoisonInPast ? (
                      <p className="text-xs text-slate-400 italic py-1">
                        🔴 Bạn đã sử dụng ĐỘC DƯỢC ở đêm trước. Thuốc này đã cạn sạch!
                      </p>
                    ) : tonightPoisonPlayer ? (
                      <div className="space-y-2">
                        <p className="text-xs text-amber-200">
                          ☠️ Đã chọn hạ độc mục tiêu:{' '}
                          <strong className="text-amber-300 font-bold text-sm">{tonightPoisonPlayer.name}</strong>
                        </p>
                        <button
                          onClick={handleCancelWitchPoison}
                          className="w-full py-2 px-3 rounded-xl bg-rose-900 hover:bg-rose-800 text-rose-200 font-bold text-xs border border-rose-500/40 flex items-center justify-center gap-1.5"
                        >
                          <span>❌</span> Hủy Hạ Độc {tonightPoisonPlayer.name}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-300 py-1">
                        🟢 Nhấp chọn 1 người chơi trong danh sách Dân Làng bên dưới để hạ độc.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/80 text-center text-xs text-slate-300 italic">
                  💤 Dân làng đang ngủ say... Phù Thủy đang thức giấc để pha chế các loại thuốc ma thuật.
                </div>
              )}
            </div>
          )}

          {/* C. GUARD NIGHT PANEL */}
          {room.nightStep === 'guard' && (
            <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 shadow-2xl space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <div>
                  <h3 className="font-serif font-bold text-emerald-200 text-sm sm:text-base">
                    BẢO VỆ THỨC GIẤC (ĐÊM THỨ {room.dayNumber})
                  </h3>
                  <p className="text-xs text-emerald-300/90">
                    {room.villagePowersLost
                      ? '⚡ Dân làng đã treo cổ Già Làng! Bảo Vệ đã MẤT HOÀN TOÀN khả năng chở che.'
                      : currentPlayer.role === 'guard'
                      ? (() => {
                          const lastGuardAction = actions.find(
                            (a) => a.actionType === 'guard_protect' && a.dayNumber === room.dayNumber - 1
                          );
                          const prevTarget = lastGuardAction
                            ? players.find((p) => p.id === lastGuardAction.targetId)
                            : null;
                          return `Nhấp chọn 1 người chơi bên dưới để giăng khiên chở che khỏi đòn tấn công của Ma Sói.${
                            prevTarget ? ` (Lưu ý: Không được bảo vệ lại ${prevTarget.name} - mục tiêu đêm trước)` : ''
                          }`;
                        })()
                      : '💤 Dân làng đang ngủ say... Bảo Vệ đang âm thầm tuần tra và giăng khiên bảo vệ.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* D. SEER NIGHT PANEL */}
          {room.nightStep === 'seer' && (
            <div className="p-4 rounded-2xl bg-indigo-950/90 border border-indigo-500/60 shadow-2xl space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔮</span>
                <div>
                  <h3 className="font-serif font-bold text-indigo-200 text-sm sm:text-base">
                    TIÊN TRI THỨC GIẤC (ĐÊM THỨ {room.dayNumber})
                  </h3>
                  <p className="text-xs text-indigo-300/90">
                    {room.villagePowersLost
                      ? '⚡ Dân làng đã treo cổ Già Làng! Tiên Tri đã MẤT HOÀN TOÀN khả năng soi chiếu.'
                      : currentPlayer.role === 'seer'
                      ? 'Nhấp chọn 1 người chơi bên dưới để soi chân tướng xem họ thuộc phe Dân Làng hay Ma Sói.'
                      : '💤 Dân làng đang ngủ say... Tiên Tri đang cầu nguyện soi rọi sự thật trong bóng đêm.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* E. CUPID NIGHT PANEL */}
          {room.nightStep === 'cupid' && (
            <div className="p-4 rounded-2xl bg-pink-950/90 border border-pink-500/60 shadow-2xl space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-xl">💘</span>
                <div>
                  <h3 className="font-serif font-bold text-pink-200 text-sm sm:text-base">
                    THẦN TÌNH YÊU THỨC GIẤC (ĐÊM THỨ {room.dayNumber})
                  </h3>
                  <p className="text-xs text-pink-300/90">
                    {currentPlayer.role === 'cupid'
                      ? 'Nhấp chọn 2 người chơi bên dưới để se duyên nối tơ hồng sinh tử.'
                      : '💤 Dân làng đang ngủ say... Thần Tình Yêu đang ban phước cho cặp đôi ngọt ngào.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* WILD CHILD NIGHT PANEL */}
          {room.nightStep === 'wild_child' && (
            <div className="p-4 rounded-2xl bg-amber-950/90 border border-amber-500/60 shadow-2xl space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-xl">👶</span>
                <div>
                  <h3 className="font-serif font-bold text-amber-200 text-sm sm:text-base">
                    ĐỨA TRẺ HOANG DÃ THỨC GIẤC (ĐÊM THỨ {room.dayNumber})
                  </h3>
                  <p className="text-xs text-amber-300/90">
                    {currentPlayer.role === 'wild_child'
                      ? 'Nhấp chọn 1 người chơi bên dưới làm Cha/ Mẹ Đỡ Đầu. Nếu họ ngã xuống, bạn sẽ biến thành Sói!'
                      : '💤 Dân làng đang ngủ say... Đứa Trẻ Hoang Dã đang chọn Cha/ Mẹ tinh thần.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* FOX NIGHT PANEL */}
          {room.nightStep === 'fox' && (
            <div className="p-4 rounded-2xl bg-orange-950/90 border border-orange-500/60 shadow-2xl space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-xl">🦊</span>
                <div>
                  <h3 className="font-serif font-bold text-orange-200 text-sm sm:text-base">
                    CON CÁO TINH RANH THỨC GIẤC (ĐÊM THỨ {room.dayNumber})
                  </h3>
                  <p className="text-xs text-orange-300/90">
                    {room.villagePowersLost
                      ? '⚡ Dân làng đã treo cổ Già Làng! Cáo đã MẤT HOÀN TOÀN khả năng ngửi mùi Sói.'
                      : currentPlayer.role === 'fox'
                      ? (currentPlayer.foxLostPower
                          ? '❌ Bạn đã bị mất khả năng ngửi hơi Sói do lần ngửi trước không có Sói nào!'
                          : 'Nhấp chọn 3 người chơi CÒN SỐNG bất kỳ bên dưới để kiểm tra xem trong nhóm đó có Sói không.')
                      : '💤 Dân làng đang ngủ say... Cáo đang ngửi mùi tìm kiếm Sói.'}
                  </p>
                </div>
              </div>
              {currentPlayer.role === 'fox' && !currentPlayer.foxLostPower && !room.villagePowersLost && (
                <div className="mt-2 text-xs text-orange-200 bg-black/40 p-2.5 rounded-xl border border-orange-500/30 flex items-center justify-between">
                  <span>
                    Đã chọn đêm nay:{' '}
                    {actions.filter(a => a.actorId === currentPlayer.id && a.actionType === 'fox_sniff' && a.dayNumber === room.dayNumber && a.targetId).length === 0 ? (
                      <span className="italic text-orange-400">Chưa chọn ai (Bấm chọn 3 người còn sống bên dưới)</span>
                    ) : (
                      <span className="font-bold text-amber-300">
                        {players
                          .filter(p => actions.some(a => a.actorId === currentPlayer.id && a.actionType === 'fox_sniff' && a.dayNumber === room.dayNumber && a.targetId === p.id))
                          .map(p => p.name)
                          .join(', ')}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* F. PIPER NIGHT PANEL */}
          {room.nightStep === 'piper' && (
            <div className="p-4 rounded-2xl bg-amber-950/90 border border-amber-500/60 shadow-2xl space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎶</span>
                <div>
                  <h3 className="font-serif font-bold text-amber-200 text-sm sm:text-base">
                    NGƯỜI THỔI SÁO THỨC GIẤC (ĐÊM THỨ {room.dayNumber})
                  </h3>
                  <p className="text-xs text-amber-300/90">
                    {currentPlayer.role === 'piper'
                      ? 'Nhấp chọn 2 người chơi CÒN SỐNG chưa bị thôi miên bên dưới để cất tiếng sáo thôi miên.'
                      : '💤 Dân làng đang ngủ say... Tiếng sáo ma mị đang du dương cất lên trong không trung.'}
                  </p>
                </div>
              </div>
              {currentPlayer.role === 'piper' && (
                <div className="mt-2 text-xs text-amber-200 bg-black/40 p-2.5 rounded-xl border border-amber-500/30 space-y-1">
                  <div>
                    <span>Đã thôi miên từ trước: </span>
                    {pastEnchantedTargetIds.length === 0 ? (
                      <span className="italic text-amber-400">Chưa có ai</span>
                    ) : (
                      <span className="font-semibold text-emerald-300">
                        {players.filter(p => pastEnchantedTargetIds.includes(p.id)).map(p => p.name).join(', ')}
                      </span>
                    )}
                  </div>
                  <div>
                    <span>Đã chọn đêm nay: </span>
                    {actions.filter(a => a.actorId === currentPlayer.id && a.actionType === 'piper_enchant' && a.dayNumber === room.dayNumber && a.targetId).length === 0 ? (
                      <span className="italic text-amber-400">Chưa chọn ai (Bấm chọn 2 người còn sống)</span>
                    ) : (
                      <span className="font-bold text-amber-300">
                        {players
                          .filter(p => actions.some(a => a.actorId === currentPlayer.id && a.actionType === 'piper_enchant' && a.dayNumber === room.dayNumber && a.targetId === p.id))
                          .map(p => p.name)
                          .join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Seer Inspection Result Alert */}
      {seerResult && (
        <div className="p-4 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs font-bold text-center flex items-center justify-between shadow-xl animate-fadeIn">
          <span>Kết quả soi của Tiên Tri: {seerResult}</span>
          <button
            onClick={() => setSeerResult(null)}
            className="text-indigo-400 hover:text-white underline text-[11px]"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Main Table Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Village Player Layout Split into 2 Parts */}
        <div className="lg:col-span-2 p-3 sm:p-6 rounded-2xl bg-slate-900 border border-purple-500/20 shadow-2xl flex flex-col justify-between space-y-4 max-w-full overflow-hidden">
          
          {/* 2-Part Container Grid: Reordered on Mobile for instant access (Player Card top, then compact Participant grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 my-auto">
            
            {/* Part 2 (Top on Mobile): Current Player's Icon, Name and Role Card */}
            <div className="order-first lg:order-last lg:col-span-4 p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-950 via-purple-950/40 to-slate-950 border border-amber-500/30 shadow-xl flex flex-row lg:flex-col items-center justify-between gap-3 text-center max-w-full">
              
              {/* Player Avatar & Status Info */}
              <div className="flex items-center lg:flex-col gap-2.5 text-left lg:text-center min-w-0 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900 border-2 border-amber-400/60 text-xl sm:text-2xl flex items-center justify-center shadow-md shrink-0">
                  {currentPlayer.avatar}
                </div>
                <div className="min-w-0 flex-1 flex flex-col items-start lg:items-center justify-center">
                  <div className="font-bold text-xs sm:text-sm text-slate-100 truncate w-full">
                    {currentPlayer.name}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full border shadow-sm inline-flex items-center justify-center mt-1 shrink-0 z-10 ${
                      currentPlayer.isAlive
                        ? 'bg-emerald-950/90 border-emerald-500/50'
                        : 'bg-rose-950/90 border-rose-500/50'
                    }`}
                    title={currentPlayer.isAlive ? 'Đang Sống' : 'Đã Chết'}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      currentPlayer.isAlive
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                    }`} />
                  </span>
                </div>
              </div>

              {/* Player Card Art (Compact view on Mobile, hold/touch to reveal) */}
              <div
                onMouseDown={() => room.status !== 'lobby' && setIsPressingMyCard(true)}
                onMouseUp={() => setIsPressingMyCard(false)}
                onMouseLeave={() => setIsPressingMyCard(false)}
                onTouchStart={() => room.status !== 'lobby' && setIsPressingMyCard(true)}
                onTouchEnd={() => setIsPressingMyCard(false)}
                onTouchCancel={() => setIsPressingMyCard(false)}
                className="relative flex flex-col items-center justify-center select-none cursor-pointer p-1.5 sm:p-2 rounded-xl bg-slate-900/80 border border-purple-500/30 hover:border-amber-400/50 transition-all shrink-0 max-w-full z-10"
              >
                <CardArt
                  role={currentPlayer.role}
                  size="sm"
                  isRevealed={room.status === 'ended' || isPressingMyCard}
                />
                <div className="mt-1 text-center">
                  <span className="text-[9px] text-amber-300 font-mono font-bold block whitespace-nowrap">
                    {isPressingMyCard ? 'Đang xem bài' : 'Chạm & Giữ'}
                  </span>
                </div>
              </div>
            </div>

            {/* Part 1 (Participant List): Compact list of village players */}
            <div className="lg:col-span-8 flex flex-col space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <h3 className="font-serif font-bold text-slate-100 text-xs sm:text-sm flex items-center gap-1.5">
                  <User className="w-4 h-4 text-purple-400" /> Danh Sách Dân Làng ({players.length} Người)
                </h3>
              </div>

              {/* Grid of Compact Player Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-1.5 sm:gap-2">
                {players.map((p) => {
                  const isMe = p.id === currentPlayer.id;
                  const isSelected = selectedTargetId === p.id;

                  const isFellowWolf =
                    isCurrentPlayerWolf &&
                    !isMe &&
                    (p.role.includes('wolf') || p.team === 'werewolves');

                  const isMyLover = !isMe && p.id === cupidLinkedPartnerId;

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (p.idiotSaved) return;
                        if (room.status === 'day_voting') {
                          if (currentPlayer.idiotSaved) return;
                          handleCastVote(p.id);
                        } else if (isNight) {
                          handlePerformNightAction(p.id);
                        }
                      }}
                      className={`relative p-1.5 sm:p-2 rounded-xl border flex items-center gap-1.5 sm:gap-2 transition-all min-w-0 ${
                        !p.isAlive
                          ? 'bg-slate-950/40 border-slate-800/80 opacity-50 grayscale cursor-default'
                          : p.idiotSaved
                          ? 'bg-amber-950/30 border-amber-500/50 opacity-80 cursor-not-allowed'
                          : isSelected
                          ? 'bg-purple-950/80 border-purple-400 ring-2 ring-purple-500 shadow-purple-950/50 scale-102 cursor-pointer'
                          : isMe
                          ? 'bg-slate-950 border-amber-500/40 hover:border-amber-400 cursor-pointer'
                          : 'bg-slate-950 border-slate-800 hover:border-purple-500/40 cursor-pointer'
                      }`}
                    >
                      {/* Compact Avatar / Icon */}
                      <div className="relative shrink-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 border border-slate-700 text-sm sm:text-base flex items-center justify-center shadow-inner">
                          {p.avatar}
                        </div>
                        {!p.isAlive && (
                          <div className="absolute -top-1 -right-1 p-0.5 rounded-full bg-rose-600 text-white shadow">
                            <Skull className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>

                      {/* Player Name & Live/Dead Status */}
                      <div className="text-left min-w-0 flex-1 overflow-hidden">
                        <div className="font-bold text-[11px] sm:text-xs text-slate-100 flex items-center gap-0.5 leading-tight min-w-0">
                          <span className="truncate min-w-0">{p.name}</span>
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate leading-tight flex items-center gap-1">
                          {p.isBot ? (
                            <span className="text-purple-400 font-bold flex items-center gap-0.5">
                              <Bot className="w-2.5 h-2.5" /> Bot
                            </span>
                          ) : (
                            <span>{p.isAlive ? (isMe ? '(Bạn)' : 'Sống') : 'Đã Chết'}</span>
                          )}
                        </div>
                      </div>

                      {/* Remove Bot Button in Lobby */}
                      {room.status === 'lobby' && p.isBot && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveBot(p.id);
                          }}
                          disabled={isProcessingAction}
                          className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-md z-20 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                          title="Xóa Bot này"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}

                      {/* Same-Team Recognition Badges & Idiot Saved Badge */}
                      {p.idiotSaved && (
                        <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-amber-950 border border-amber-400 text-amber-200 font-bold text-[8px] shadow-lg flex items-center gap-0.5 z-10">
                          <span>🤡 Tha chết</span>
                        </div>
                      )}

                      {isFellowWolf && !p.idiotSaved && (
                        <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-rose-950 border border-rose-500/80 text-rose-300 font-bold text-[8px] shadow-lg flex items-center gap-0.5 z-10">
                          <span>🐺 Sói</span>
                        </div>
                      )}

                      {isMyLover && (
                        <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-pink-950 border border-pink-500/80 text-pink-300 font-bold text-[8px] shadow-lg flex items-center gap-0.5 z-10 animate-pulse">
                          <span>💘 Yêu</span>
                        </div>
                      )}

                      {/* Night Action Selection Indicator */}
                      {isNight && actions.some((a) => a.actorId === currentPlayer.id && a.targetId === p.id && a.dayNumber === room.dayNumber) && (
                        <div className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[8px] shadow-lg flex items-center gap-0.5 border border-emerald-400/50 z-10">
                          <CheckCircle className="w-2.5 h-2.5 text-amber-300" />
                          <span>Đã Chọn</span>
                        </div>
                      )}

                      {/* Secret Vote status tags */}
                      {room.status === 'day_voting' && (
                        <>
                          {votes.some((v) => v.voterId === currentPlayer.id && v.targetId === p.id) && (
                            <div className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded-full bg-purple-600 text-white font-bold text-[8px] shadow-lg animate-bounce flex items-center gap-0.5 z-10">
                              <CheckCircle className="w-2.5 h-2.5 text-amber-300" />
                              <span>Bạn Chọn</span>
                            </div>
                          )}
                          {votes.some((v) => v.voterId === p.id) && (
                            <div
                              className="absolute -top-1 -right-1 p-0.5 rounded-full bg-slate-800 border border-emerald-500/60 text-emerald-400 shadow z-10"
                              title="Đã bỏ phiếu"
                            >
                              <Vote className="w-3 h-3" />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Chat & Voice Channel */}
        <div className="h-[520px]">
          <TextChatPanel
            roomId={room.id}
            messages={messages}
            currentPlayer={currentPlayer}
            isNight={isNight}
          />
        </div>
      </div>

      {/* Match Active Roles Info Panel - Placed at the bottom */}
      {rolesSummary.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2 text-slate-200 font-serif font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>CÁC VAI DIỄN TRONG VÁN ĐẤU ({players.length} Người Chơi)</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-0.5">
            {rolesSummary.map(({ role, meta, total }) => (
              <div
                key={role}
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 shadow-sm text-xs transition-all ${
                  meta.team === 'werewolves'
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    : meta.team === 'neutral'
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    : 'bg-slate-950/70 border-slate-700/60 text-slate-200'
                }`}
              >
                <span className="font-bold">{meta.name}</span>
                <span className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-white/10 font-mono font-bold text-[11px] text-amber-300">
                  x{total}
                </span>
              </div>
            ))}
          </div>

          {/* Bot Control Row below Roles Summary in Lobby */}
          {room.status === 'lobby' && (() => {
            const targetPlayerCount = room.rolesList && room.rolesList.length > 0 ? room.rolesList.length : 8;
            const neededBots = targetPlayerCount - players.length;
            return (
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Bot className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Thiếu người chơi? Thêm Bot để bắt đầu ngay ({players.filter((p) => p.isBot).length} Bot):</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleAddBots(1)}
                    disabled={isProcessingAction}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all border border-purple-400/30 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+1 Bot</span>
                  </button>

                  <button
                    onClick={() => handleAddBots(3)}
                    disabled={isProcessingAction}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all border border-indigo-400/30 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+3 Bot</span>
                  </button>

                  {neededBots > 0 && (
                    <button
                      onClick={() => handleAddBots(neededBots)}
                      disabled={isProcessingAction}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all border border-amber-400/40 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Lấp Đầy {neededBots} Người</span>
                    </button>
                  )}

                  {players.filter((p) => p.isBot).length > 0 && (
                    <button
                      onClick={() => handleRemoveBot()}
                    disabled={isProcessingAction}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1.5 shadow transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>-1 Bot</span>
                  </button>
                )}

                {players.filter((p) => p.isBot).length > 1 && (
                  <button
                    onClick={handleRemoveAllBots}
                    disabled={isProcessingAction}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 font-bold text-xs flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Xóa toàn bộ Bot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Hết</span>
                  </button>
                )}
              </div>
            </div>
            );
          })()}
        </div>
      )}

      {/* Cinematic Lore Story Preamble Modal */}
      <StoryPreambleModal
        isOpen={isStoryPreambleOpen}
        onClose={() => setIsStoryPreambleOpen(false)}
        room={room}
        players={players}
        currentPlayer={currentPlayer}
        onProceedToCardReveal={() => {
          setIsStoryPreambleOpen(false);
          setIsCardRevealOpen(true);
        }}
      />

      {/* Secret Card Reveal Modal */}
      <CardRevealModal
        isOpen={isCardRevealOpen}
        onClose={() => setIsCardRevealOpen(false)}
        player={currentPlayer}
      />

      {/* Early Voting Confirmation Modal */}
      {isEarlyVotingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-fadeIn overflow-x-hidden">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-4 sm:p-6 max-w-[calc(100vw-1.5rem)] sm:max-w-md w-full shadow-2xl text-slate-100 space-y-4 relative overflow-hidden">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-amber-200">
                  Xác Nhận Kết Thúc Thảo Luận Sớm?
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Đồng bộ tất cả người chơi</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-white/5">
              Bạn muốn ngưng thảo luận và chuyển sang <strong className="text-rose-400 font-bold">Bỏ Phiếu</strong> luôn không?
              <br /><br />
              <span className="text-amber-300/90 text-[11px] block italic">
                ⚡ Lưu ý: Tất cả người chơi trong phòng sẽ cùng chuyển sang giao diện Bỏ Phiếu ngay lập tức.
              </span>
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsEarlyVotingModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-white/10 transition-all"
              >
                Hủy Bỏ
              </button>

              <button
                onClick={handleToggleEarlyVoteReady}
                disabled={isProcessingAction || !isAlive}
                className={`px-4 py-2 rounded-xl font-bold text-xs shadow-lg flex items-center gap-1.5 transition-all border hover:scale-105 disabled:opacity-50 ${
                  hasEarlyVoteReady
                    ? 'bg-emerald-600 border-emerald-400 text-white ring-2 ring-emerald-500/50'
                    : 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white border-amber-400/30'
                }`}
              >
                {isProcessingAction ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : hasEarlyVoteReady ? (
                  <CheckCircle className="w-3.5 h-3.5 text-amber-300" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>
                  {hasEarlyVoteReady ? '✓ Đã Đồng Ý' : 'Bỏ Phiếu Sớm'}{' '}
                  ({earlyVoteCount}/{earlyVoteTotal} người chơi)
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hunter Shot Modal */}
      {room.pendingHunterShot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-fadeIn overflow-x-hidden">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl p-4 sm:p-6 max-w-[calc(100vw-1.5rem)] sm:max-w-lg w-full shadow-2xl text-slate-100 space-y-4 relative overflow-hidden">
            <div className="flex items-center gap-3 text-amber-400 border-b border-amber-500/30 pb-3">
              <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 shrink-0">
                <Target className="w-7 h-7 text-amber-400 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-serif font-bold text-amber-300 flex items-center gap-2">
                  🎯 PHÁT ĐẠN CUỐI CÙNG CỦA THỢ SĂN
                </h3>
                <span className="text-xs text-slate-300 block truncate">
                  Thợ Săn <strong className="text-amber-400">{room.pendingHunterShot.hunterName}</strong> ({room.pendingHunterShot.reason})
                </span>
              </div>
            </div>

            {currentPlayer.id === room.pendingHunterShot.hunterId ? (
              <div className="space-y-3">
                <p className="text-xs sm:text-sm text-slate-200 bg-slate-950/80 p-3 rounded-xl border border-amber-500/30">
                  ⚡ <strong>Bạn là Thợ Săn!</strong> Trước khi trút hơi thở cuối cùng, bạn có quyền kéo theo 1 người xuống mồ cùng bạn. Hãy chọn mục tiêu bên dưới:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                  {players
                    .filter((p) => p.isAlive && p.id !== currentPlayer.id)
                    .map((targetP) => (
                      <button
                        key={targetP.id}
                        onClick={() => handleHunterShoot(targetP.id)}
                        disabled={isProcessingAction}
                        className="p-2.5 rounded-xl bg-slate-950 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500 flex flex-col items-center gap-1 transition-all group cursor-pointer text-center"
                      >
                        <span className="text-xl">{targetP.avatar}</span>
                        <span className="text-xs font-bold text-slate-100 group-hover:text-rose-300 truncate w-full">
                          {targetP.name}
                        </span>
                        <span className="text-[10px] text-rose-400 font-bold bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-500/40 group-hover:scale-105 transition-transform">
                          🎯 Bắn Gục
                        </span>
                      </button>
                    ))}
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={handleHunterPass}
                    disabled={isProcessingAction}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 border border-slate-600 shadow-md cursor-pointer"
                  >
                    <span>🕊️</span>
                    <span>Bỏ Qua (Không Bắn Ai)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-2">
                <p className="text-xs sm:text-sm text-amber-200 font-semibold animate-pulse">
                  ⏳ Thợ Săn <strong className="text-amber-400">{room.pendingHunterShot.hunterName}</strong> đang ngắm bắn và đưa ra quyết định cuối cùng...
                </p>
                <p className="text-xs text-slate-400">Vui lòng đợi trong giây lát!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Minimum Players Requirement Modal */}
      {minPlayersModalOpen && (() => {
        const targetPlayerCount = room.rolesList && room.rolesList.length > 0 ? room.rolesList.length : 8;
        const neededBots = Math.max(1, targetPlayerCount - players.length);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in duration-200">
            <div className="relative w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-5 shadow-2xl flex flex-col space-y-4 text-slate-100">
              <button
                onClick={() => setMinPlayersModalOpen(false)}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all hover:scale-105 active:scale-95"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-amber-300">CẦN TỐI THIỂU {targetPlayerCount} NGƯỜI CHƠI</h3>
                  <p className="text-[11px] text-slate-400">Theo cấu hình phòng chơi</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Theo bộ vai diễn đã chọn cho phòng này, ván đấu cần có <strong>tối thiểu {targetPlayerCount} người chơi</strong> (bao gồm người thật và Bot) để đảm bảo chia đủ bộ vai diễn.
              </p>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Số lượng hiện tại trong phòng:</span>
                <div className="flex items-center gap-1.5 font-bold font-mono">
                  <span className="text-rose-400 text-sm sm:text-base">{players.length}</span>
                  <span className="text-slate-500">/</span>
                  <span className="text-emerald-400 text-sm sm:text-base">{targetPlayerCount} người</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  onClick={async () => {
                    await handleAddBots(neededBots);
                    setMinPlayersModalOpen(false);
                  }}
                  disabled={isProcessingAction}
                  className="w-full sm:flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg transition-all border border-purple-400/30 hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Bot className="w-4 h-4 text-amber-300" />
                  <span>Thêm {neededBots} Bot Cho Đủ {targetPlayerCount}</span>
                </button>

                <button
                  onClick={() => setMinPlayersModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm border border-slate-700 transition-all cursor-pointer"
                >
                  ĐÃ HIỂU
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Victory Screen Modal */}
      {room.status === 'ended' && (
        <VictoryModal
          winner={room.winner || 'villagers'}
          players={players}
          actions={actions}
          currentPlayerId={currentPlayer.id}
          onRematch={handleStartMatch}
          onReturnLobby={async () => {
            await updateRoomState(room.id, { status: 'lobby' });
            if (onLeaveRoom) {
              onLeaveRoom();
            }
          }}
        />
      )}
    
      {/* Sleek In-Game Toast Notification Banner */}
      {toastNotification && (
        <div
          key={toastNotification.id}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] sm:w-auto px-4 py-3 rounded-2xl bg-slate-900/95 border border-purple-500/50 text-slate-100 shadow-2xl shadow-purple-950/80 backdrop-blur-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ring-1 ring-white/10"
        >
          <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-400/40 flex items-center justify-center shrink-0 text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </div>
          <p className="text-xs sm:text-sm font-medium leading-snug flex-1 pr-1 text-slate-100">
            {toastNotification.text}
          </p>
          <button
            onClick={() => setToastNotification(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors shrink-0 cursor-pointer"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
