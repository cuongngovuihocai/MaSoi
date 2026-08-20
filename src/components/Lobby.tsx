import React, { useState } from 'react';
import { PRESET_ROLE_SETUPS, ROLE_DEFINITIONS, getUniqueBotNames } from '../data/roles';
import { Player, RoleType, Room, RoomConfig } from '../types';
import { batchJoinPlayers, createRoom, joinRoom } from '../services/firebase';
import { Users, Plus, LogIn, Bot, Crown, Play, Shield, Sparkles, UserCheck, Loader2, Minus, X } from 'lucide-react';

interface LobbyProps {
  onRoomJoined: (roomId: string, player: Player) => void;
}

const AVATARS = [
  '🐺', '🧙‍♀️', '🔮', '🛡️', '🏹', '📜', '👑', '🦊', '🎺', '👼', '🤡', '🗡️',
  '🧟‍♂️', '🧛‍♂️', '👻', '👺', '🕯️', '🧪', '☠️', '🐾', '🦉', '🌙', '🗝️', '🖤'
];

export const Lobby: React.FC<LobbyProps> = ({ onRoomJoined }) => {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('werewolf_player_name') || 'Người Chơi ' + Math.floor(Math.random() * 900 + 100);
  });
  const [avatar, setAvatar] = useState('🧙‍♀️');
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [joinPin, setJoinPin] = useState('');
  const [selectedPresetNum, setSelectedPresetNum] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showBotModal, setShowBotModal] = useState(false);
  const [botCount, setBotCount] = useState<number>(9);

  // Room config options
  const [config, setConfig] = useState<RoomConfig>({
    discussionTimeSeconds: 180, // 3 phút
    votingTimeSeconds: 60, // 1 phút
    defenseTimeSeconds: 45,
    narratorEnabled: true,
    voiceChatEnabled: true,
  });

  const saveName = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('werewolf_player_name', name);
  };

  const generateRoomPin = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pin = '';
    for (let i = 0; i < 6; i++) {
      pin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pin;
  };

  const handleCreateRoom = async (isSoloBotMode = false, customBotCount?: number) => {
    if (!playerName.trim()) {
      setErrorMsg('Vui lòng nhập tên của bạn!');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const roomId = generateRoomPin();
      const playerId = 'usr_' + Math.random().toString(36).substring(2, 9);

      const hostPlayer: Player = {
        id: playerId,
        name: playerName.trim(),
        avatar,
        isHost: true,
        isAlive: true,
        role: 'villager',
        team: 'villagers',
      };

      const targetPresetNum = isSoloBotMode && customBotCount ? (customBotCount + 1) : selectedPresetNum;
      const preset = PRESET_ROLE_SETUPS[targetPresetNum] || PRESET_ROLE_SETUPS[10];

      const roomData: Room = {
        id: roomId,
        hostId: playerId,
        hostName: playerName.trim(),
        status: 'lobby',
        dayNumber: 1,
        phaseEndTime: 0,
        nightStep: 'cupid',
        nightStepEndTime: 0,
        rolesList: preset.roles,
        config,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await createRoom(roomData, hostPlayer);

      // If Solo Bot mode requested, auto-fill remaining slots with AI Bots using atomic batching
      if (isSoloBotMode) {
        const neededBots = customBotCount || (preset.roles.length - 1);
        const botNamesToUse = getUniqueBotNames([hostPlayer], neededBots);

        const botPlayers: Player[] = [];
        for (let i = 0; i < neededBots; i++) {
          const botId = 'bot_' + Math.random().toString(36).substring(2, 9);
          botPlayers.push({
            id: botId,
            name: botNamesToUse[i],
            avatar: AVATARS[i % AVATARS.length],
            isHost: false,
            isAlive: true,
            role: 'villager',
            team: 'villagers',
            isBot: true,
          });
        }
        await batchJoinPlayers(roomId, botPlayers);
      }

      setShowBotModal(false);
      onRoomJoined(roomId, hostPlayer);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tạo phòng!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setErrorMsg('Vui lòng nhập tên!');
      return;
    }
    if (!joinPin.trim()) {
      setErrorMsg('Vui lòng nhập mã phòng!');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const pin = joinPin.trim().toUpperCase();
      const playerId = 'usr_' + Math.random().toString(36).substring(2, 9);
      const player: Player = {
        id: playerId,
        name: playerName.trim(),
        avatar,
        isHost: false,
        isAlive: true,
        role: 'villager',
        team: 'villagers',
      };

      await joinRoom(pin, player);
      onRoomJoined(pin, player);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tham gia phòng!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="lobby-container" className="w-full max-w-2xl mx-auto p-4 space-y-6">
      {/* Player Profile Card */}
      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] space-y-4">
        <h2 className="font-serif font-bold text-lg text-slate-100 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-purple-400" /> Hồ Sơ Người Chơi
        </h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-300 block mb-1">Tên của bạn</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => saveName(e.target.value)}
              placeholder="Nhập tên..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/30 backdrop-blur-md border border-white/15 text-slate-100 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/40 text-sm font-semibold transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1">Chọn biểu tượng đại diện</label>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setAvatar(emoji)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    avatar === emoji
                      ? 'bg-purple-600/90 border-2 border-purple-300 scale-110 shadow-lg shadow-purple-900/60'
                      : 'bg-slate-950/30 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-purple-400/40'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-950/50 backdrop-blur-md border border-rose-500/40 text-rose-300 text-xs font-semibold text-center">
          {errorMsg}
        </div>
      )}

      {/* Main Home Choices */}
      {mode === 'home' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setMode('create')}
            className="p-6 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl border border-purple-400/30 hover:border-purple-300 hover:from-purple-900/30 hover:to-white/10 hover:shadow-[0_8px_32px_0_rgba(168,85,247,0.3)] text-left transition-all group shadow-xl flex flex-col justify-between h-44"
          >
            <div className="p-3 w-fit rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/40 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Tạo Phòng Mới</h3>
              <p className="text-xs text-slate-300 mt-1">Tạo phòng chơi cùng bạn bè</p>
            </div>
          </button>

          <button
            onClick={() => setMode('join')}
            className="p-6 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl border border-indigo-400/30 hover:border-indigo-300 hover:from-indigo-900/30 hover:to-white/10 hover:shadow-[0_8px_32px_0_rgba(99,102,241,0.3)] text-left transition-all group shadow-xl flex flex-col justify-between h-44"
          >
            <div className="p-3 w-fit rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 group-hover:scale-110 transition-transform">
              <LogIn className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Tham Gia Phòng</h3>
              <p className="text-xs text-slate-300 mt-1">Nhập mã PIN để vào chơi</p>
            </div>
          </button>

          <button
            onClick={() => setShowBotModal(true)}
            disabled={isSubmitting}
            className={`p-6 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl border border-emerald-400/30 hover:border-emerald-300 hover:from-emerald-900/30 hover:to-white/10 hover:shadow-[0_8px_32px_0_rgba(16,185,129,0.3)] text-left transition-all group shadow-xl flex flex-col justify-between h-44 ${
              isSubmitting ? 'opacity-80 cursor-not-allowed border-emerald-400' : ''
            }`}
          >
            <div className="p-3 w-fit rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 group-hover:scale-110 transition-transform flex items-center justify-center">
              {isSubmitting ? (
                <Loader2 className="w-6 h-6 animate-spin text-emerald-300" />
              ) : (
                <Bot className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <span>Chơi Với Bot</span>
                {isSubmitting && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 animate-pulse">
                    Đang khởi tạo...
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                {isSubmitting ? '⚡ Đang thêm Bot và tạo phòng chơi...' : 'Không đủ bạn chơi? Hãy vào đây!'}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Bot Selection Modal */}
      {showBotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-x-hidden">
          <div className="w-full max-w-[calc(100vw-1.5rem)] sm:max-w-lg bg-slate-900/60 backdrop-blur-2xl border border-emerald-500/40 rounded-2xl p-4 sm:p-6 shadow-[0_16px_48px_0_rgba(0,0,0,0.8)] space-y-4 sm:space-y-5 relative animate-in fade-in zoom-in duration-200 overflow-hidden">
            <button
              onClick={() => setShowBotModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-slate-100 text-base">Cấu Hình</h3>
                <p className="text-xs text-slate-400">Chọn tối thiểu 7, tối đa 25</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Stepper + Display */}
              <div className="p-4 rounded-xl bg-slate-950/50 backdrop-blur-md border border-emerald-500/30 flex flex-col items-center space-y-3">
                <span className="text-xs text-slate-400 font-medium">Số lượng Bot tham gia:</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setBotCount((prev) => Math.max(7, prev - 1))}
                    disabled={botCount <= 7}
                    className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 flex items-center justify-center hover:bg-slate-700 active:scale-95 disabled:opacity-40 transition-all"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <div className="text-center min-w-[100px]">
                    <span className="font-serif font-black text-3xl text-emerald-300">{botCount}</span>
                  </div>
                  <button
                    onClick={() => setBotCount((prev) => Math.min(25, prev + 1))}
                    disabled={botCount >= 25}
                    className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 flex items-center justify-center hover:bg-slate-700 active:scale-95 disabled:opacity-40 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-center text-xs text-slate-300 font-mono bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-500/30">
                  👥 Tổng ván đấu: <strong>{botCount + 1} Người chơi</strong> (1 Bạn + {botCount} Bot)
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowBotModal(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleCreateRoom(true, botCount)}
                  disabled={isSubmitting}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 border border-emerald-400/40 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang Khởi Tạo...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4" />
                      <span>Vào Phòng Chơi</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Room Form */}
      {mode === 'create' && (
        <div className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-purple-500/30 shadow-[0_16px_48px_0_rgba(0,0,0,0.6)] space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="font-serif font-bold text-lg text-slate-100">Cấu Hình Phòng Mới</h3>
            <button
              onClick={() => setMode('home')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Hủy
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Chọn số lượng người chơi & Bộ vai trò
              </label>
              <select
                value={selectedPresetNum}
                onChange={(e) => setSelectedPresetNum(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 backdrop-blur-md border border-purple-500/30 text-slate-100 text-sm font-medium focus:outline-none focus:border-purple-400"
              >
                {Object.entries(PRESET_ROLE_SETUPS).map(([num, preset]) => (
                  <option key={num} value={num} className="bg-slate-900 text-white">
                    {preset.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Roles preview */}
            <div className="p-3 rounded-xl bg-slate-950/40 backdrop-blur-md border border-slate-800/80 space-y-2">
              <span className="text-xs text-slate-400 block">
                Danh sách thẻ bài sẽ chia trong phòng ({selectedPresetNum} lá):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(PRESET_ROLE_SETUPS[selectedPresetNum] || PRESET_ROLE_SETUPS[10]).roles.map(
                  (roleKey, idx) => {
                    const r = ROLE_DEFINITIONS[roleKey];
                    return (
                      <span
                        key={idx}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium ${r.badgeColor}`}
                      >
                        {r.name}
                      </span>
                    );
                  }
                )}
              </div>
            </div>

            {/* Timers config */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Thời gian bàn luận (Phút)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="30"
                  value={config.discussionTimeSeconds / 60}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setConfig({ ...config, discussionTimeSeconds: Math.max(10, Math.round(val * 60)) });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 backdrop-blur-md border border-purple-500/30 text-slate-100 text-xs font-semibold"
                />
              </div>
            </div>

            <button
              onClick={() => handleCreateRoom(false)}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm shadow-lg hover:from-purple-500 hover:to-indigo-500 transition-all border border-purple-400/30"
            >
              {isSubmitting ? 'Đang tạo phòng...' : 'Bắt Đầu Tạo Phòng'}
            </button>
          </div>
        </div>
      )}

      {/* Join Room Form */}
      {mode === 'join' && (
        <div className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-indigo-500/30 shadow-[0_16px_48px_0_rgba(0,0,0,0.6)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="font-serif font-bold text-lg text-slate-100">Tham Gia Phòng Ma Sói</h3>
            <button
              onClick={() => setMode('home')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Hủy
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Nhập mã phòng (6 ký tự PIN)</label>
              <input
                type="text"
                maxLength={6}
                value={joinPin}
                onChange={(e) => setJoinPin(e.target.value.toUpperCase())}
                placeholder="VD: X8K2L9"
                className="w-full px-4 py-3 rounded-xl bg-slate-950/50 backdrop-blur-md border border-indigo-500/40 text-purple-300 font-mono font-extrabold text-center tracking-widest text-lg uppercase focus:outline-none focus:border-indigo-400"
              />
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all border border-indigo-400/30"
            >
              {isSubmitting ? 'Đang vào phòng...' : 'Vào Phòng Ngay'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
