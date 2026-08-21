import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { soundEffects } from '../services/audioSynthesizer';
import { Player, Team, RoleType, NightActionRecord } from '../types';
import { ROLE_DEFINITIONS } from '../data/roles';
import {
  Trophy,
  RefreshCw,
  Home,
  Skull,
  Eye,
  Bot,
  Heart,
  Moon,
  Shield,
  Activity,
  UserCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface VictoryModalProps {
  winner: Team | 'lovers' | 'piper' | 'angel' | 'white_wolf' | string;
  players: Player[];
  actions?: NightActionRecord[];
  currentPlayerId?: string;
  onRematch: () => void;
  onReturnLobby: () => void;
}

const parseDeathTiming = (deathTiming?: string) => {
  if (!deathTiming) return null;
  const match = deathTiming.match(/(\d+)/);
  if (!match) return null;
  const dayNum = parseInt(match[1], 10);
  const isNight = deathTiming.includes('đêm');
  return { isNight, dayNum };
};

export const VictoryModal: React.FC<VictoryModalProps> = ({
  winner,
  players,
  actions = [],
  currentPlayerId,
  onRematch,
  onReturnLobby,
}) => {
  const [activeTab, setActiveTab] = useState<'players' | 'timeline'>('players');

  useEffect(() => {
    // Play celebratory victory fanfare sound effect
    soundEffects.playVictoryFanfare();

    // Fire celebratory confetti
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  }, []);

  const getWinnerText = () => {
    switch (winner) {
      case 'werewolves':
        return {
          title: 'PHE MA SÓI CHIẾN THẮNG!',
          subtitle: 'Bóng tối đã bao trùm hoàn toàn U Hồn trấn.',
          color: 'from-rose-600 to-red-900 border-rose-500',
        };
      case 'villagers':
        return {
          title: 'PHE DÂN LÀNG CHIẾN THẮNG!',
          subtitle: 'Toàn bộ lũ Ma Sói hung hãn đã bị tiêu diệt!',
          color: 'from-emerald-600 to-teal-900 border-emerald-500',
        };
      case 'lovers':
        return {
          title: 'CẶP ĐÔI TÌNH YÊU CHIẾN THẮNG!',
          subtitle: 'Sức mạnh tình yêu đã vượt qua mọi rào cản phe phái!',
          color: 'from-pink-600 to-purple-900 border-pink-500',
        };
      case 'piper':
        return {
          title: 'NGƯỜI THỔI SÁO CHIẾN THẮNG!',
          subtitle: 'Tiếng sáo huyền bí đã thôi miên toàn bộ dân làng!',
          color: 'from-teal-600 to-cyan-900 border-teal-500',
        };
      case 'angel':
        return {
          title: 'THIÊN THẦN CHIẾN THẮNG!',
          subtitle: 'Thiên thần đã tìm ra đường về Thiên Đường!',
          color: 'from-sky-500 to-indigo-900 border-sky-400',
        };
      case 'white_wolf':
        return {
          title: 'SÓI TRẮNG CHIẾN THẮNG!',
          subtitle: 'Sói Trắng đã tiêu diệt cả bầy Sói lẫn Dân Làng và trở thành bá chủ duy nhất!',
          color: 'from-slate-200 via-slate-400 to-slate-800 border-slate-300 text-slate-100',
        };
      default:
        return {
          title: 'TRẬN ĐẤU KẾT THÚC!',
          subtitle: 'Một chiến thắng đầy ấn tượng!',
          color: 'from-purple-600 to-slate-900 border-purple-500',
        };
    }
  };

  const winInfo = getWinnerText();

  // Helper to find lover partner
  const getLoverPartnerName = (playerId: string): string | null => {
    const player = players.find((p) => p.id === playerId);
    if (player?.loverId) {
      const partner = players.find((p) => p.id === player.loverId);
      if (partner) return partner.name;
    }
    const cupidActions = actions.filter((a) => a.actionType === 'cupid_link');
    const linkedTargetIds = cupidActions.map((a) => a.targetId).filter(Boolean);
    if (linkedTargetIds.includes(playerId)) {
      const partnerId = linkedTargetIds.find((id) => id !== playerId);
      if (partnerId) {
        const partner = players.find((p) => p.id === partnerId);
        if (partner) return partner.name;
      }
    }
    return null;
  };

  // Group players into 3 major factions
  const werewolfPlayers = players.filter(
    (p) => p.team === 'werewolves' || (ROLE_DEFINITIONS[p.role]?.team === 'werewolves' && p.role !== 'wolf_man')
  );

  const neutralPlayers = players.filter(
    (p) =>
      !werewolfPlayers.includes(p) &&
      (ROLE_DEFINITIONS[p.role]?.team === 'neutral' || p.team === 'neutral')
  );

  const villagerPlayers = players.filter(
    (p) => !werewolfPlayers.includes(p) && !neutralPlayers.includes(p)
  );

  const getRoleGroupsForPlayers = (groupPlayers: Player[]) => {
    const map = new Map<RoleType, Player[]>();
    groupPlayers.forEach((p) => {
      const list = map.get(p.role) || [];
      list.push(p);
      map.set(p.role, list);
    });

    const result: { role: RoleType; rolePlayers: Player[] }[] = [];
    map.forEach((rolePlayers, role) => {
      result.push({ role, rolePlayers });
    });
    return result;
  };

  // Extract all night numbers present in actions or max dayNumber
  const maxDayNumber = Math.max(
    1,
    ...actions.map((a) => a.dayNumber),
    ...players.map((p) => {
      const parsed = parseDeathTiming(p.deathTiming);
      return parsed ? parsed.dayNum : 1;
    })
  );

  const nightNumbers = Array.from({ length: maxDayNumber }, (_, i) => i + 1);

  return (
    <div id="victory-modal" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/95 backdrop-blur-md overflow-hidden">
      <div className="relative w-full max-w-[calc(100vw-1rem)] sm:max-w-4xl bg-slate-900 border-2 border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col p-2.5 sm:p-5 gap-2 sm:gap-3 my-auto max-h-[96vh] h-full sm:h-auto">
        {/* Banner Header */}
        <div className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r ${winInfo.color} border shadow-xl text-center flex flex-col landscape:flex-row items-center justify-center gap-1 sm:gap-2 shrink-0`}>
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-300 animate-bounce shrink-0" />
          <div className="space-y-0.5">
            <h2 className="font-serif font-black text-base sm:text-2xl text-white tracking-wide leading-tight">
              {winInfo.title}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-200">{winInfo.subtitle}</p>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('players')}
            className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'players'
                ? 'bg-purple-600 text-white shadow-md border border-purple-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>👥 Danh Sách Phân Vai</span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'bg-purple-600 text-white shadow-md border border-purple-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>🌙 Nhật Ký Hoạt động</span>
          </button>
        </div>

        {/* TAB 1: BẠCH HÓA DANH SÁCH VAI DIỄN & NGƯỜI CHƠI */}
        {activeTab === 'players' && (
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
            <div className="flex items-center justify-center gap-2 text-slate-300 font-bold text-xs uppercase tracking-wider sticky top-0 bg-slate-900/95 backdrop-blur py-1.5 z-10 border-b border-slate-800">
              <Eye className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>CHI TIẾT PHÂN VAI ({players.length} NGƯỜI CHƠI)</span>
            </div>

            {/* 🐺 1. NHÓM MA SÓI */}
            {werewolfPlayers.length > 0 && (
              <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-600/40 space-y-2.5">
                <div className="flex items-center justify-between text-rose-300 font-bold text-xs uppercase tracking-wider border-b border-rose-500/20 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🐺</span>
                    <span className="font-serif font-bold text-sm text-rose-200">Nhóm Ma Sói</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-rose-900/70 border border-rose-500/40 text-rose-200 text-[10px] font-mono">
                    {werewolfPlayers.length} thành viên
                  </span>
                </div>

                <div className="space-y-2.5">
                  {getRoleGroupsForPlayers(werewolfPlayers).map(({ role, rolePlayers }) => (
                    <RoleGroupRow
                      key={role}
                      role={role}
                      rolePlayers={rolePlayers}
                      allPlayers={players}
                      actions={actions}
                      currentPlayerId={currentPlayerId}
                      getLoverPartnerName={getLoverPartnerName}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 🏡 2. NHÓM DÂN LÀNG & CHỨC NĂNG */}
            {villagerPlayers.length > 0 && (
              <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-600/40 space-y-2.5">
                <div className="flex items-center justify-between text-emerald-300 font-bold text-xs uppercase tracking-wider border-b border-emerald-500/20 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🏡</span>
                    <span className="font-serif font-bold text-sm text-emerald-200">Nhóm Dân Làng & Chức Năng</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-900/70 border border-emerald-500/40 text-emerald-200 text-[10px] font-mono">
                    {villagerPlayers.length} thành viên
                  </span>
                </div>

                <div className="space-y-2.5">
                  {getRoleGroupsForPlayers(villagerPlayers).map(({ role, rolePlayers }) => (
                    <RoleGroupRow
                      key={role}
                      role={role}
                      rolePlayers={rolePlayers}
                      allPlayers={players}
                      actions={actions}
                      currentPlayerId={currentPlayerId}
                      getLoverPartnerName={getLoverPartnerName}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 🎭 3. NHÓM PHE THỨ 3 / TRUNG LẬP */}
            {neutralPlayers.length > 0 && (
              <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-600/40 space-y-2.5">
                <div className="flex items-center justify-between text-amber-300 font-bold text-xs uppercase tracking-wider border-b border-amber-500/20 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🎭</span>
                    <span className="font-serif font-bold text-sm text-amber-200">Nhóm Phe Thứ 3 / Trung Lập</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-900/70 border border-amber-500/40 text-amber-200 text-[10px] font-mono">
                    {neutralPlayers.length} thành viên
                  </span>
                </div>

                <div className="space-y-2.5">
                  {getRoleGroupsForPlayers(neutralPlayers).map(({ role, rolePlayers }) => (
                    <RoleGroupRow
                      key={role}
                      role={role}
                      rolePlayers={rolePlayers}
                      allPlayers={players}
                      actions={actions}
                      currentPlayerId={currentPlayerId}
                      getLoverPartnerName={getLoverPartnerName}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: NHẬT KÝ HOẠT ĐỘNG THEO ĐÊM */}
        {activeTab === 'timeline' && (
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
            <div className="flex items-center justify-center gap-2 text-slate-300 font-bold text-xs uppercase tracking-wider sticky top-0 bg-slate-900/95 backdrop-blur py-1.5 z-10 border-b border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>NHẬT KÝ HOẠT ĐỘNG</span>
            </div>

            <div className="space-y-3">
              {nightNumbers.map((nightNum) => (
                <NightTimelineCard
                  key={nightNum}
                  nightNum={nightNum}
                  actions={actions}
                  players={players}
                />
              ))}
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center gap-2 sm:gap-3 pt-1.5 sm:pt-2 shrink-0 border-t border-slate-800">
          <button
            onClick={onRematch}
            className="flex-1 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all border border-purple-400/30 hover:scale-[1.02] active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> CHƠI LẠI
          </button>
          <button
            onClick={onReturnLobby}
            className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-xs sm:text-sm border border-slate-700 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
          >
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" /> VỀ SẢNH
          </button>
        </div>
      </div>
    </div>
  );
};

const getRoleEmoji = (role: RoleType): string => {
  switch (role) {
    case 'werewolf':
    case 'white_wolf':
    case 'curse_wolf':
    case 'dire_wolf':
      return '🐺';
    case 'seer':
      return '🔮';
    case 'cupid':
      return '💘';
    case 'guard':
      return '🛡️';
    case 'witch':
      return '🧪';
    case 'hunter':
      return '🏹';
    case 'elder':
      return '📜';
    case 'idiot':
      return '🤪';
    case 'piper':
      return '🎶';
    case 'angel':
      return '👼';
    case 'fox':
      return '🦊';
    case 'villager':
      return '🧑‍🌾';
    default:
      return '🎭';
  }
};

// Helper to format player's night activity
const getPlayerActionLogs = (
  player: Player,
  actions: NightActionRecord[],
  allPlayers: Player[]
): { icon: string; text: string }[] => {
  const playerActions = actions.filter((a) => a.actorId === player.id);
  const logs: { icon: string; text: string }[] = [];

  playerActions.forEach((a) => {
    const target = allPlayers.find((tp) => tp.id === a.targetId);
    const targetName = target ? target.name : 'Chưa chọn';

    if (a.actionType === 'cupid_link') {
      const linkedActions = actions.filter((x) => x.actionType === 'cupid_link' && x.actorId === player.id);
      const linkedNames = linkedActions
        .map((x) => allPlayers.find((tp) => tp.id === x.targetId)?.name)
        .filter(Boolean);
      if (linkedNames.length > 0) {
        logs.push({
          icon: '💘',
          text: `Đêm ${a.dayNumber}: Se duyên cho ${linkedNames.join(' & ')}`,
        });
      }
    } else if (a.actionType === 'seer_inspect') {
      const isWolf = target?.role.includes('wolf') || target?.team === 'werewolves';
      logs.push({
        icon: '🔮',
        text: `Đêm ${a.dayNumber}: Soi ${targetName} (${isWolf ? 'Ma Sói 🐺' : 'Dân Làng 🧑‍🌾'})`,
      });
    } else if (a.actionType === 'guard_protect') {
      logs.push({
        icon: '🛡️',
        text: `Đêm ${a.dayNumber}: Bảo vệ ${targetName}`,
      });
    } else if (a.actionType === 'witch_heal') {
      let healName = targetName;
      if ((!target || a.targetId === 'auto_wolf_victim') && !a.isRefunded) {
        const wolfAction = actions.find((x) => x.dayNumber === a.dayNumber && (x.actionType === 'wolf_final_kill' || x.actionType === 'wolf_final_kill_random' || x.actionType === 'wolf_bite'));
        const wolfVictim = allPlayers.find((p) => p.id === wolfAction?.targetId);
        if (wolfVictim) healName = wolfVictim.name;
      }
      logs.push({
        icon: '💊',
        text: `Đêm ${a.dayNumber}: Dùng bình cứu cho ${healName}`,
      });
    } else if (a.actionType === 'witch_poison') {
      logs.push({
        icon: '🧪',
        text: `Đêm ${a.dayNumber}: Dùng bình độc cho ${targetName}`,
      });
    } else if (a.actionType === 'curse_wolf_curse') {
      logs.push({
        icon: '🔮',
        text: `Đêm ${a.dayNumber}: Nguyền rủa biến ${targetName} thành Ma Sói`,
      });
    } else if (a.actionType === 'white_wolf_kill') {
      logs.push({
        icon: '🐺',
        text: `Đêm ${a.dayNumber}: Sói Trắng bí mật cắn hạ ${targetName}`,
      });
    } else if (a.actionType === 'dire_wolf_kill') {
      logs.push({
        icon: '🐺',
        text: `Đêm ${a.dayNumber}: Sói Hùm cắn thêm ${targetName}`,
      });
    } else if (a.actionType === 'piper_enchant') {
      logs.push({
        icon: '🎶',
        text: `Đêm ${a.dayNumber}: Thôi miên ${targetName}`,
      });
    } else if (a.actionType === 'wild_child_model') {
      logs.push({
        icon: '👶',
        text: `Đêm ${a.dayNumber}: Chọn ${targetName} làm Mẹ Tinh Thần`,
      });
    } else if (a.actionType === 'fox_sniff') {
      const sameNightFoxActions = actions.filter((x) => x.actionType === 'fox_sniff' && x.actorId === player.id && x.dayNumber === a.dayNumber);
      const foxTargets = sameNightFoxActions.map((x) => allPlayers.find((tp) => tp.id === x.targetId)).filter(Boolean) as Player[];
      const foxNames = foxTargets.map((p) => p.name).join(', ');
      const hasWolf = foxTargets.some((p) => p.team === 'werewolves' || p.role.includes('wolf'));
      logs.push({
        icon: '🦊',
        text: `Đêm ${a.dayNumber}: Đánh hơi nhóm (${foxNames || 'Chưa chọn'}) ➔ ${hasWolf ? 'Phát hiện có Ma Sói 🐺 (Cáo giữ phép)' : 'Không có Ma Sói ❌ (Cáo mất phép)'}`,
      });
    } else if (a.actionType === 'wolf_bite') {
      logs.push({
        icon: '🐺',
        text: `Đêm ${a.dayNumber}: Chọn cắn ${targetName}`,
      });
    }
  });

  // Deduplicate
  const unique: typeof logs = [];
  const seen = new Set<string>();
  logs.forEach((l) => {
    if (!seen.has(l.text)) {
      seen.add(l.text);
      unique.push(l);
    }
  });

  return unique;
};

const RoleGroupRow: React.FC<{
  role: RoleType;
  rolePlayers: Player[];
  allPlayers: Player[];
  actions: NightActionRecord[];
  currentPlayerId?: string;
  getLoverPartnerName: (id: string) => string | null;
}> = ({ role, rolePlayers, allPlayers, actions, currentPlayerId, getLoverPartnerName }) => {
  const roleMeta = ROLE_DEFINITIONS[role];
  const roleName = roleMeta?.name || role;
  const roleEmoji = getRoleEmoji(role);
  const badgeBg = roleMeta?.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
      {/* Role Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg">{roleEmoji}</span>
          <span className="font-bold text-xs sm:text-sm text-slate-100">{roleName}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeBg}`}>
            x{rolePlayers.length}
          </span>
        </div>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {rolePlayers.map((p) => {
          const isMe = p.id === currentPlayerId;
          const loverPartner = getLoverPartnerName(p.id);
          const actionLogs = getPlayerActionLogs(p, actions, allPlayers);

          return (
            <div
              key={p.id}
              className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 text-xs transition-all ${
                p.isAlive
                  ? 'bg-slate-900/90 border-slate-700 text-slate-200'
                  : 'bg-rose-950/30 border-rose-900/50 text-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs sm:text-sm text-white break-words">
                      {p.name}
                    </span>
                    {isMe && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                        (Bạn)
                      </span>
                    )}
                    {p.isBot && (
                      <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        <Bot className="w-3 h-3 text-slate-400" />
                        Bot
                      </span>
                    )}
                  </div>
                </div>

                {p.isAlive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/90 px-2 py-0.5 rounded-md border border-emerald-500/40 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Sống Sót
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-950/90 px-2 py-0.5 rounded-md border border-rose-500/40 shrink-0">
                    <Skull className="w-3 h-3 text-rose-400 shrink-0" />
                    Tử Vong
                  </span>
                )}
              </div>

              {/* Status Details */}
              <div className="pt-1.5 border-t border-slate-800/80 flex flex-col gap-1 text-[11px]">
                {!p.isAlive && (
                  <div className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-900/60 flex flex-wrap items-center gap-1.5 text-rose-200">
                    <span className="font-bold text-amber-300">
                      ⏱️ {p.deathTiming || 'Tử vong trong trận'}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-rose-200">
                      📌 Nguyên nhân: {p.deathReason || 'Bị sát hại'}
                    </span>
                  </div>
                )}

                {loverPartner && (
                  <div className="flex items-center gap-1.5 text-pink-300 font-medium bg-pink-950/40 px-2 py-1 rounded-lg border border-pink-500/30 text-[11px]">
                    <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400 shrink-0" />
                    <span>Tình nhân với: <strong className="text-pink-100 font-bold">{loverPartner}</strong></span>
                  </div>
                )}

                {p.role === 'wild_child' && p.fosterParentId && (() => {
                  const fosterParentName = allPlayers.find((tp) => tp.id === p.fosterParentId)?.name;
                  return (
                    <div className="flex items-center gap-1.5 text-lime-300 font-medium bg-lime-950/40 px-2 py-1 rounded-lg border border-lime-500/30 text-[11px]">
                      <span className="text-xs">👶</span>
                      <span>Mẹ Tinh Thần: <strong className="text-lime-100 font-bold">{fosterParentName || 'Chưa rõ'}</strong></span>
                    </div>
                  );
                })()}

                {/* Night Action Logs */}
                {actionLogs.length > 0 && (
                  <div className="space-y-1 pt-0.5">
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      Hoạt động đêm:
                    </span>
                    <div className="space-y-0.5">
                      {actionLogs.map((log, i) => (
                        <div key={i} className="text-[11px] text-slate-300 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5">
                          <span>{log.icon}</span>
                          <span>{log.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Night-by-Night Timeline Component
const NightTimelineCard: React.FC<{
  nightNum: number;
  actions: NightActionRecord[];
  players: Player[];
}> = ({ nightNum, actions, players }) => {
  const nightActions = actions.filter(
    (a) =>
      a.dayNumber === nightNum &&
      a.actionType !== 'village_nominate' &&
      a.actionType !== 'village_verdict_execute' &&
      a.actionType !== 'village_verdict_pardon'
  );

  // 1. Cupid
  const cupidActions = nightActions.filter((a) => a.actionType === 'cupid_link' && a.targetId);
  const cupidActorId = cupidActions[0]?.actorId;
  const cupidPlayer = players.find((p) => p.id === cupidActorId) || players.find((p) => p.role === 'cupid');
  const cupidTargetNames = cupidActions.map((a) => players.find((p) => p.id === a.targetId)?.name).filter(Boolean);

  // 1b. Wild Child
  const wildChildActions = nightActions.filter((a) => a.actionType === 'wild_child_model' && a.targetId);
  const wildChildActorId = wildChildActions[0]?.actorId;
  const wildChildPlayer = players.find((p) => p.id === wildChildActorId) || players.find((p) => p.role === 'wild_child');
  const wildChildTargetName = players.find((p) => p.id === wildChildActions[0]?.targetId)?.name;

  // 2. Werewolves
  const wolfActions = nightActions.filter((a) => a.actionType === 'wolf_bite' && a.targetId);
  const wolfFinalKill = nightActions.find((a) => a.actionType === 'wolf_final_kill' || a.actionType === 'wolf_final_kill_random');
  const wolfPlayers = players.filter((p) => p.role.includes('wolf') || p.team === 'werewolves');
  const wolfNamesStr = wolfPlayers.map((p) => p.name).join(', ') || 'Ma Sói';
  const chosenWolfTargets = Array.from(
    new Set(wolfActions.map((a) => players.find((p) => p.id === a.targetId)?.name).filter(Boolean))
  );
  // Top bitten target
  const wolfBiteCounts: Record<string, number> = {};
  wolfActions.forEach((a) => {
    if (a.targetId) wolfBiteCounts[a.targetId] = (wolfBiteCounts[a.targetId] || 0) + 1;
  });
  let topWolfTargetId = '';
  let maxBites = 0;
  Object.entries(wolfBiteCounts).forEach(([tId, count]) => {
    if (count > maxBites) {
      maxBites = count;
      topWolfTargetId = tId;
    }
  });
  const finalWolfTargetId = wolfFinalKill?.targetId || topWolfTargetId;
  const bittenTargetName = players.find((p) => p.id === finalWolfTargetId)?.name;

  // Determine if it was a random tie pick vs majority choice
  let isRandomWolfPick = false;
  if (wolfFinalKill) {
    isRandomWolfPick = wolfFinalKill.actionType === 'wolf_final_kill_random';
  } else if (wolfActions.length > 0) {
    const topTargets = Object.entries(wolfBiteCounts).filter(([, count]) => count === maxBites);
    isRandomWolfPick = topTargets.length > 1;
  }

  const totalWolfVotes = wolfActions.length;
  const votesForTarget = finalWolfTargetId ? (wolfBiteCounts[finalWolfTargetId] || 0) : 0;

  // 3. Guard
  const guardActions = nightActions.filter((a) => a.actionType === 'guard_protect' && a.targetId);
  const guardActorId = guardActions[0]?.actorId;
  const guardPlayer = players.find((p) => p.id === guardActorId) || players.find((p) => p.role === 'guard');
  const guardTargetName = players.find((p) => p.id === guardActions[0]?.targetId)?.name;

  // 4. Seer
  const seerActions = nightActions.filter((a) => a.actionType === 'seer_inspect' && a.targetId);
  const seerActorId = seerActions[0]?.actorId;
  const seerPlayer = players.find((p) => p.id === seerActorId) || players.find((p) => p.role === 'seer');

  // 5. Witch
  const witchHealActions = nightActions.filter((a) => a.actionType === 'witch_heal' && a.targetId && !a.isRefunded);
  const witchPoisonActions = nightActions.filter((a) => a.actionType === 'witch_poison' && a.targetId);
  const witchActorId = witchHealActions[0]?.actorId || witchPoisonActions[0]?.actorId;
  const witchPlayer = players.find((p) => p.id === witchActorId) || players.find((p) => p.role === 'witch');
  let witchHealTargetName = players.find((p) => p.id === witchHealActions[0]?.targetId)?.name;
  if (!witchHealTargetName && witchHealActions.length > 0) {
    const wolfAction = nightActions.find((x) => x.actionType === 'wolf_final_kill' || x.actionType === 'wolf_final_kill_random' || x.actionType === 'wolf_bite');
    const wolfVictim = players.find((p) => p.id === wolfAction?.targetId);
    if (wolfVictim) witchHealTargetName = wolfVictim.name;
  }
  const witchPoisonTargetName = players.find((p) => p.id === witchPoisonActions[0]?.targetId)?.name;

  // 6. Curse Wolf
  const curseWolfActions = nightActions.filter((a) => a.actionType === 'curse_wolf_curse' && a.targetId);
  const curseWolfActorId = curseWolfActions[0]?.actorId;
  const curseWolfPlayer = players.find((p) => p.id === curseWolfActorId) || players.find((p) => p.role === 'curse_wolf');
  let curseWolfTargetName = players.find((p) => p.id === curseWolfActions[0]?.targetId)?.name;
  if (!curseWolfTargetName && curseWolfActions.length > 0) {
    const wolfAction = nightActions.find((x) => x.actionType === 'wolf_final_kill' || x.actionType === 'wolf_final_kill_random' || x.actionType === 'wolf_bite');
    const wolfVictim = players.find((p) => p.id === wolfAction?.targetId);
    if (wolfVictim) curseWolfTargetName = wolfVictim.name;
  }

  // 7. Dire Wolf
  const direWolfActions = nightActions.filter((a) => a.actionType === 'dire_wolf_kill' && a.targetId);
  const direWolfActorId = direWolfActions[0]?.actorId;
  const direWolfPlayer = players.find((p) => p.id === direWolfActorId) || players.find((p) => p.role === 'dire_wolf');
  const direWolfTargetName = players.find((p) => p.id === direWolfActions[0]?.targetId)?.name;

  // 7b. White Wolf
  const whiteWolfActions = nightActions.filter((a) => a.actionType === 'white_wolf_kill' && a.targetId);
  const whiteWolfActorId = whiteWolfActions[0]?.actorId;
  const whiteWolfPlayer = players.find((p) => p.id === whiteWolfActorId) || players.find((p) => p.role === 'white_wolf');
  const whiteWolfTargetName = players.find((p) => p.id === whiteWolfActions[0]?.targetId)?.name;

  // 6. Piper
  const piperActions = nightActions.filter((a) => a.actionType === 'piper_enchant' && a.targetId);
  const piperActorId = piperActions[0]?.actorId;
  const piperPlayer = players.find((p) => p.id === piperActorId) || players.find((p) => p.role === 'piper');
  const piperTargetNames = piperActions.map((a) => players.find((p) => p.id === a.targetId)?.name).filter(Boolean);

  // 6b. Fox
  const foxActions = nightActions.filter((a) => a.actionType === 'fox_sniff' && a.targetId);
  const foxActorId = foxActions[0]?.actorId;
  const foxPlayer = players.find((p) => p.id === foxActorId) || players.find((p) => p.role === 'fox');
  const foxTargets = foxActions.map((a) => players.find((p) => p.id === a.targetId)).filter(Boolean) as Player[];
  const hasWolfInFoxSniff = foxTargets.some((p) => p.team === 'werewolves' || p.role.includes('wolf'));

  // Deaths in that specific night & morning cycle (Night N & Morning N+1)
  const nightDeaths = players.filter((p) => {
    if (p.isAlive || !p.deathTiming) return false;
    const parsed = parseDeathTiming(p.deathTiming);
    if (!parsed) return false;

    // Night death for nightNum (e.g. "Chết đêm ngày 4")
    if (parsed.isNight && parsed.dayNum === nightNum) return true;

    // Morning death for nightNum + 1 (or Day 1 morning if nightNum === 1)
    if (!parsed.isNight) {
      if (nightNum === 1 && (parsed.dayNum === 1 || parsed.dayNum === 2)) return true;
      if (parsed.dayNum === nightNum + 1) return true;
    }

    return false;
  });

  // Village execution by hanging & nomination (happens on Sáng ngày nightNum + 1)
  const dayVotingActions = actions.filter((a) => a.dayNumber === nightNum + 1);
  const villageNominateActions = dayVotingActions.filter((a) => a.actionType === 'village_nominate');
  const villageVerdictActions = dayVotingActions.filter(
    (a) => a.actionType === 'village_verdict_execute' || a.actionType === 'village_verdict_pardon'
  );
  const hangedPlayers = players.filter((p) => {
    if (p.isAlive || p.deathReason !== 'Bị treo cổ' || !p.deathTiming) return false;
    const parsed = parseDeathTiming(p.deathTiming);
    if (!parsed) return false;

    if (nightNum === 1 && (parsed.dayNum === 1 || parsed.dayNum === 2)) return true;
    return !parsed.isNight && parsed.dayNum === nightNum + 1;
  });

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2 text-purple-300 font-serif font-bold text-sm sm:text-base">
          <Moon className="w-4 h-4 text-purple-400 animate-pulse" />
          <span>ĐÊM THỨ {nightNum}</span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          {nightActions.length} hành động ghi nhận
        </span>
      </div>

      <div className="space-y-2 text-xs">
        {/* 1. Cupid */}
        {cupidActions.length > 0 && (
          <div className="p-2.5 rounded-xl bg-pink-950/30 border border-pink-500/30 text-pink-200 flex items-start gap-2">
            <span className="text-lg shrink-0">💘</span>
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-pink-300">
                Thần Tình Yêu ({cupidPlayer ? cupidPlayer.name : 'Cupid'}):
              </span>
              <p className="text-xs">
                Đã nối dây tơ hồng se duyên cho:{' '}
                <strong className="text-white font-bold">
                  {cupidTargetNames.join(' + ') || 'Không rõ'}
                </strong>
              </p>
            </div>
          </div>
        )}

        {/* 1b. Wild Child */}
        {wildChildActions.length > 0 && (
          <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 flex items-start gap-2">
            <span className="text-lg shrink-0">👶</span>
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-amber-300">
                Đứa Trẻ Hoang Dã ({wildChildPlayer ? wildChildPlayer.name : 'Đứa Trẻ Hoang Dã'}):
              </span>
              <p className="text-xs">
                Đã chọn Cha/ Mẹ Tinh Thần:{' '}
                <strong className="text-white font-bold">
                  {wildChildTargetName || 'Không rõ'}
                </strong>
              </p>
            </div>
          </div>
        )}

        {/* 2. Werewolves */}
        {wolfActions.length > 0 && (
          <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-200 flex items-start gap-2">
            <span className="text-lg shrink-0">🐺</span>
            <div className="space-y-1 min-w-0">
              <span className="font-bold text-rose-300">
                Phe Ma Sói ({wolfNamesStr}):
              </span>
              <div className="text-xs space-y-0.5">
                <p>
                  Đã thảo luận & chọn các mục tiêu:{' '}
                  <strong className="text-amber-200 font-bold">
                    {chosenWolfTargets.join(', ') || 'Chưa chọn'}
                  </strong>
                </p>
                <p>
                  Đã chốt cắn con mồi:{' '}
                  <strong className="text-rose-300 font-bold text-sm">
                    {bittenTargetName || 'Không ai'}
                  </strong>
                  {bittenTargetName && (
                    isRandomWolfPick ? (
                      <span className="ml-1 text-[11px] text-amber-300 font-normal italic">
                        (Hệ thống chọn ngẫu nhiên trong các mục tiêu do Ma Sói bất đồng/bằng phiếu)
                      </span>
                    ) : (
                      totalWolfVotes > 0 && (
                        <span className="ml-1 text-[11px] text-amber-300 font-normal italic">
                          (tỉ lệ chọn là {votesForTarget} trên {totalWolfVotes})
                        </span>
                      )
                    )
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. Guard */}
        {guardActions.length > 0 && (
          <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 flex items-start gap-2">
            <span className="text-lg shrink-0">🛡️</span>
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-emerald-300">
                Bảo Vệ ({guardPlayer ? guardPlayer.name : 'Bảo Vệ'}):
              </span>
              <p className="text-xs">
                Đã che chở cho:{' '}
                <strong className="text-white font-bold">
                  {guardTargetName || 'Không bảo vệ ai'}
                </strong>
              </p>
            </div>
          </div>
        )}

        {/* 4. Seer */}
        {seerActions.length > 0 && (
          <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 flex items-start gap-2">
            <span className="text-lg shrink-0">🔮</span>
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-indigo-300">
                Tiên Tri ({seerPlayer ? seerPlayer.name : 'Tiên Tri'}):
              </span>
              <div className="space-y-1 text-xs">
                {seerActions.map((a, idx) => {
                  const target = players.find((p) => p.id === a.targetId);
                  const isWolf = target?.role.includes('wolf') || target?.team === 'werewolves';
                  return (
                    <p key={idx}>
                      Soi chân tướng của <strong className="text-white">{target?.name || 'Người chơi'}</strong> ➔ Kết quả:{' '}
                      <span className={isWolf ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {isWolf ? 'Chính là Ma Sói 🐺' : 'Là Dân Làng 🧑‍🌾'}
                      </span>
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 5. Witch */}
        {(witchHealActions.length > 0 || witchPoisonActions.length > 0) && (
          <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200 flex items-start gap-2">
            <span className="text-lg shrink-0">🧪</span>
            <div className="space-y-1 min-w-0">
              <span className="font-bold text-purple-300">
                Phù Thủy ({witchPlayer ? witchPlayer.name : 'Phù Thủy'}):
              </span>
              <div className="text-xs space-y-0.5">
                {witchHealTargetName && (
                  <p>
                    💊 Đã sử dụng bình Giải dược để cứu sống:{' '}
                    <strong className="text-emerald-300 font-bold">{witchHealTargetName}</strong>
                  </p>
                )}
                {witchPoisonTargetName && (
                  <p>
                    ☠️ Sử dụng bình Độc dược để hạ sát:{' '}
                    <strong className="text-rose-300 font-bold">{witchPoisonTargetName}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 6. Curse Wolf */}
        {curseWolfActions.length > 0 && (
          <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200 flex items-start gap-2">
            <span className="text-lg shrink-0">🔮</span>
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-purple-300">
                Sói Nguyền ({curseWolfPlayer ? curseWolfPlayer.name : 'Sói Nguyền'}):
              </span>
              <p className="text-xs">
                Dùng lời nguyền để biến{' '}
                <strong className="text-amber-300 font-bold">{curseWolfTargetName || 'Nạn nhân Sói'}</strong> thành Ma Sói mới.
              </p>
            </div>
          </div>
        )}

        {/* 7. Dire Wolf */}
        {direWolfActions.length > 0 && (
          <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/30 text-red-200 flex items-start gap-2">
            <span className="text-lg shrink-0">🐺</span>
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-red-300">
                Sói Hùm ({direWolfPlayer ? direWolfPlayer.name : 'Sói Hùm'}):
              </span>
              <p className="text-xs">
                Cắn thêm nạn nhân thứ hai:{' '}
                <strong className="text-amber-300 font-bold">{direWolfTargetName || 'Dân làng'}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* 7b. White Wolf */}
        {whiteWolfActions.length > 0 && (
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-500/40 text-slate-200 flex items-start gap-2">
            <span className="text-lg shrink-0">🐺</span>
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-slate-300">
                Sói Trắng ({whiteWolfPlayer ? whiteWolfPlayer.name : 'Sói Trắng'}):
              </span>
              <p className="text-xs">
                Bí mật ra tay tiêu diệt Sói đồng loại:{' '}
                <strong className="text-rose-300 font-bold">{whiteWolfTargetName || 'Một con Sói'}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* 8. Piper */}
        {piperActions.length > 0 && (
          <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 flex items-start gap-2">
            <span className="text-lg shrink-0">🎶</span>
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-amber-300">
                Người Thổi Sáo ({piperPlayer ? piperPlayer.name : 'Người Thổi Sáo'}):
              </span>
              <p className="text-xs">
                Dùng tiếng sáo thôi miên:{' '}
                <strong className="text-white font-bold">
                  {piperTargetNames.join(' + ') || 'Không ai'}
                </strong>
              </p>
            </div>
          </div>
        )}

        {/* 8b. Fox */}
        {foxActions.length > 0 && (
          <div className="p-2.5 rounded-xl bg-orange-950/30 border border-orange-500/30 text-orange-200 flex items-start gap-2">
            <span className="text-lg shrink-0">🦊</span>
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-orange-300">
                Cáo ({foxPlayer ? foxPlayer.name : 'Cáo'}):
              </span>
              <p className="text-xs">
                Đánh hơi nhóm 3 người:{' '}
                <strong className="text-white font-bold">
                  {foxTargets.map((p) => p.name).join(', ') || 'Chưa chọn'}
                </strong>{' '}
                ➔ Kết quả:{' '}
                <span className={hasWolfInFoxSniff ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
                  {hasWolfInFoxSniff ? 'Có Ma Sói ở gần 🐺 (Cáo giữ phép)' : 'Không có Ma Sói nào ❌ (Cáo bị mất năng lực)'}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* 9. Morning & Village Execution Section */}
        <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 font-serif font-bold text-amber-300 text-xs sm:text-sm">
            <span>☀️</span>
            <span>SÁNG NGÀY {nightNum + 1}: BIỂU QUYẾT CỦA DÂN LÀNG</span>
          </div>

          {villageNominateActions.length > 0 ? (
            villageNominateActions.map((nomAct, idx) => {
              const targetP = players.find((p) => p.id === nomAct.targetId);
              const verdictAct = villageVerdictActions.find((v) => v.targetId === nomAct.targetId) || villageVerdictActions[idx];
              const isHanged = hangedPlayers.some((p) => p.id === nomAct.targetId) || verdictAct?.actionType === 'village_verdict_execute';

              return (
                <div key={nomAct.targetId ? `${nomAct.targetId}_${idx}` : idx} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
                  {villageNominateActions.length > 1 && (
                    <span className="text-[10px] uppercase font-mono font-semibold text-amber-400/80 block">
                      Lượt biểu quyết thứ {idx + 1}
                    </span>
                  )}
                  <p className="text-slate-200">
                    <span className="text-slate-400">Người bị đưa ra biểu quyết: </span>
                    {targetP ? (
                      <strong className="text-amber-200 font-bold text-sm">{targetP.name}</strong>
                    ) : (
                      <span className="text-slate-400 italic">Không rõ</span>
                    )}
                  </p>
                  <p className="text-slate-300">
                    <span className="text-slate-400">Phán quyết cuối cùng: </span>
                    {targetP ? (
                      isHanged ? (
                        <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-700/50">
                          Treo cổ 🪢
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/50">
                          Tha bổng 🕊️
                        </span>
                      )
                    ) : (
                      <span className="text-slate-500 italic">Không diễn ra xét xử</span>
                    )}
                  </p>
                </div>
              );
            })
          ) : hangedPlayers.length > 0 ? (
            hangedPlayers.map((hp) => (
              <div key={hp.id} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
                <p className="text-slate-200">
                  <span className="text-slate-400">Người bị đưa ra biểu quyết: </span>
                  <strong className="text-amber-200 font-bold text-sm">{hp.name}</strong>
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">Phán quyết cuối cùng: </span>
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-700/50">
                    Treo cổ 🪢
                  </span>
                </p>
              </div>
            ))
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
              <p className="text-slate-200">
                <span className="text-slate-400">Người bị đưa ra biểu quyết: </span>
                <span className="text-slate-400 italic">Không có ai (không đủ phiếu đề cử)</span>
              </p>
              <p className="text-slate-300">
                <span className="text-slate-400">Phán quyết cuối cùng: </span>
                <span className="text-slate-500 italic">Không diễn ra xét xử</span>
              </p>
            </div>
          )}

          {/* Casualties summary for this cycle */}
          {nightDeaths.length > 0 && (
            <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-600/40 text-rose-200 space-y-1.5 text-xs">
              <span className="font-bold text-rose-300 flex items-center gap-1.5">
                <Skull className="w-3.5 h-3.5 text-rose-400" />
                Danh sách biến cố tử vong (Đêm {nightNum} - Sáng ngày {nightNum + 1}):
              </span>
              <div className="space-y-1.5 pl-3">
                {nightDeaths.map((p) => {
                  const isLoverDeath = p.deathReason?.includes('người yêu') || p.deathReason?.includes('Đau xót');
                  const isHunterShot = p.deathReason?.includes('Thợ Săn');
                  return (
                    <div key={p.id} className="flex items-center gap-1.5 text-slate-200 flex-wrap">
                      <span className="font-bold text-white">• {p.name}:</span>
                      <span className="text-amber-300 text-[11px] px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/40">
                        {p.deathTiming}
                      </span>
                      <span>-</span>
                      <span
                        className={`font-semibold ${
                          isLoverDeath
                            ? 'text-pink-300 bg-pink-950/50 px-2 py-0.5 rounded border border-pink-500/40'
                            : isHunterShot
                            ? 'text-amber-200 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/40'
                            : 'text-rose-300'
                        }`}
                      >
                        {isLoverDeath && '💔 '}
                        {isHunterShot && '🎯 '}
                        {p.deathReason || 'Qua đời'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {nightActions.length === 0 && nightDeaths.length === 0 && (
          <p className="text-xs text-slate-500 italic text-center py-1">
            Không có ghi nhận hành động đặc biệt trong đêm này.
          </p>
        )}
      </div>
    </div>
  );
};
