import React, { useEffect, useState } from 'react';
import { Player, Room, RoleType } from '../types';
import { ROLE_DEFINITIONS, getRoleEpithet } from '../data/roles';
import { narrator } from '../services/narratorEngine';
import { soundEffects } from '../services/audioSynthesizer';
import {
  Sparkles,
  BookOpen,
  Users,
  ShieldAlert,
  Moon,
  Feather,
  Mic,
  MicOff,
  Cpu,
} from 'lucide-react';

interface StoryPreambleModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onProceedToCardReveal: () => void;
}

const CollapsibleText: React.FC<{
  text: string;
  previewText?: string;
  className?: string;
  maxLines?: number;
}> = ({ text, previewText, className, maxLines = 3 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isExpanded) {
    let displayText = previewText;
    if (!displayText) {
      const allLines = text.split('\n');
      const nonStartEmptyLines = allLines.filter((l) => l.trim().length > 0);
      if (nonStartEmptyLines.length <= maxLines) {
        return <p className={className}>{text}</p>;
      }
      displayText = nonStartEmptyLines.slice(0, maxLines).join('\n');
    }

    return (
      <p className={className}>
        {displayText}
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          style={{ fontSize: '18px' }}
          className="inline-flex items-center text-amber-400 hover:text-amber-300 font-patrick font-bold text-[18px] ml-2 underline decoration-amber-400/50 hover:decoration-amber-300 transition-colors"
        >
          ... - Xem thêm
        </button>
      </p>
    );
  }

  return (
    <p className={className}>
      {text}
      <button
        type="button"
        onClick={() => setIsExpanded(false)}
        style={{ fontSize: '18px' }}
        className="inline-flex items-center text-amber-400 hover:text-amber-300 font-patrick font-bold text-[18px] ml-2 underline decoration-amber-400/50 hover:decoration-amber-300 transition-colors"
      >
        - Thu gọn
      </button>
    </p>
  );
};

export function formatRoleComposition(playersList: Player[], roomRolesList?: RoleType[]): string {
  const roles =
    playersList && playersList.length > 0
      ? playersList.map((p) => p.role)
      : roomRolesList && roomRolesList.length > 0
      ? roomRolesList
      : [];

  if (roles.length === 0) {
    return '1 tiên tri lẩn thẩn, 1 thợ săn chột mắt, 1 bảo vệ mê ngủ, 2 người dân lông bông không nghề ngỗng gì, và 2 con sói đáng yêu ẩn dưới lốt dân thường.';
  }

  const counts: Record<string, number> = {};
  roles.forEach((r) => {
    counts[r] = (counts[r] || 0) + 1;
  });

  const parts: string[] = [];
  let seed = 0;
  for (const [role, count] of Object.entries(counts)) {
    seed++;
    const ep = getRoleEpithet(role, seed);
    if (role.includes('wolf')) {
      parts.push(`${count} con sói ${ep} ẩn dưới lốt dân thường`);
    } else if (role === 'villager') {
      parts.push(`${count} người dân ${ep}`);
    } else if (role === 'seer') {
      parts.push(`${count} tiên tri ${ep}`);
    } else if (role === 'hunter') {
      parts.push(`${count} thợ săn ${ep}`);
    } else if (role === 'guard') {
      parts.push(`${count} bảo vệ ${ep}`);
    } else if (role === 'knight') {
      parts.push(`${count} hiệp sĩ ${ep}`);
    } else if (role === 'witch') {
      parts.push(`${count} phù thủy ${ep}`);
    } else if (role === 'cupid') {
      parts.push(`${count} thần tình yêu ${ep}`);
    } else if (role === 'elder') {
      parts.push(`${count} già làng ${ep}`);
    } else if (role === 'piper') {
      parts.push(`${count} người thổi sáo ${ep}`);
    } else if (role === 'fox') {
      parts.push(`${count} cáo ${ep}`);
    } else if (role === 'idiot') {
      parts.push(`${count} kẻ ngốc ${ep}`);
    } else {
      const metaName = (ROLE_DEFINITIONS[role as RoleType]?.name || role).toLowerCase();
      parts.push(`${count} ${metaName} ${ep}`);
    }
  }

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} và ${parts[1]}`;
  return parts.slice(0, -1).join(', ') + ', và ' + parts[parts.length - 1];
}

export const StoryPreambleModal: React.FC<StoryPreambleModalProps> = ({
  isOpen,
  onClose,
  room,
  players,
  currentPlayer,
  onProceedToCardReveal,
}) => {
  const [speechEnabled, setSpeechEnabled] = useState(narrator.speechEnabled);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activePartIndex, setActivePartIndex] = useState<number | null>(null);

  const playerNamesList = players.map((p) => p.name).join(', ');

  // Exact system script texts requested
  const systemWelcomeText = `Xác nhận: ${players.length} thành viên đã có mặt.
Xin chào! Ta là Hệ thống — sẽ đồng hành cùng các bạn trong cuộc chơi lần này.
${playerNamesList} — đã điểm danh đầy đủ!
Tuyệt vời! Không thiếu một ai.
Có thể các bạn chưa từng gặp nhau. Có thể vài người đã quen biết nhau.
Nhưng đừng lo — các bạn sẽ sớm có rất nhiều chuyện để nói với nhau.
Một ngày đẹp trời để dạo chơi.
Nào, hãy nhắm mắt lại, và nắm chặt tay. Khoá cảng sẽ đưa chúng ta xuyên không đến U Hồn Trấn!
Chúc các bạn có thật nhiều thời gian vui vẻ!
Và!... Chúc may mắn.`;

  const loreContextText = `Hỡi những thành viên dũng cảm và mưu lược, ranh mãnh và cả tin, hãy mở mắt ra nhìn.
Đây chính là U Hồn Trấn mà ta từng giới thiệu.

Nắng nhẹ phủ lên những mái nhà cũ. Con đường lát đá dẫn qua quảng trường. Tiếng rao từ khu chợ vọng lại. Khói bếp bay lên sau những mái nhà. Xa xa, phía bên kia con suối, những cánh rừng xanh trải dài đến tận chân núi.

Một buổi sáng bình yên như mọi ngày.

Chỉ có một chút mới mẻ...
Hôm nay, cả U Hồn Trấn chỉ có ${players.length} người.
Mỗi người mang theo một câu chuyện riêng.
Họ sẽ làm quen.
Họ sẽ trò chuyện.
Họ sẽ cùng khám phá nơi đây.

Và khi màn đêm đầu tiên buông xuống... Mọi thứ sẽ không còn như ban ngày...
Nhưng trước tiên, mỗi người cần biết mình sẽ là ai trong câu chuyện này.
Một số người sẽ bảo vệ thị trấn.
Một số người sẽ phải tìm ra sự thật.
Và đâu đó giữa những người vừa gặp nhau... Có những kẻ đang che giấu thân phận thật sự.

Hãy nhận lấy thẻ bài của mình. Nhớ giữ cho kỹ. Đừng tiết lộ bí mật này cho bất cứ ai.`;

  const fullSpeechText = `${systemWelcomeText}\n\n${loreContextText}`;

  const triggerNarration = () => {
    soundEffects.playNightWind();
    narrator.speak(
      [systemWelcomeText, loreContextText],
      'wind',
      2000,
      'teleport',
      (partIdx) => setActivePartIndex(partIdx)
    );
    setIsPlayingAudio(true);
  };

  useEffect(() => {
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    if (isOpen) {
      setActivePartIndex(null);
      // 1 second delay before speech narration starts when opening modal
      delayTimer = setTimeout(() => {
        triggerNarration();
      }, 1000);
    } else {
      narrator.stop();
      setIsPlayingAudio(false);
      setActivePartIndex(null);
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      narrator.stop();
      setActivePartIndex(null);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleVoice = () => {
    const nextState = !narrator.speechEnabled;
    narrator.speechEnabled = nextState;
    setSpeechEnabled(nextState);
    if (!nextState) {
      narrator.stop();
      setIsPlayingAudio(false);
      setActivePartIndex(null);
    } else {
      triggerNarration();
    }
  };

  return (
    <div
      id="story-preamble-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-fade-in overflow-hidden"
    >
      <div className="relative w-full max-w-[calc(100vw-1.25rem)] sm:max-w-2xl bg-slate-900 border border-amber-500/30 rounded-3xl p-4 sm:p-7 shadow-2xl overflow-y-auto overflow-x-hidden max-h-[92vh] text-center flex flex-col items-center">
        {/* Ambient Glows Clipped */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-600/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-purple-600/20 rounded-full blur-3xl" />
        </div>

        {/* Top Controls Header */}
        <div className="flex items-center justify-end w-full mb-3">
          <button
            id="btn-switch-voice-provider"
            onClick={handleToggleVoice}
            className={`px-3.5 py-1.5 rounded-full border text-xs sm:text-sm font-patrick font-medium transition-all flex items-center gap-1.5 shadow-md ${
              speechEnabled
                ? 'bg-purple-950/80 hover:bg-purple-900 border-purple-400/50 text-purple-200'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={speechEnabled ? 'Tắt giọng đọc Quản trò' : 'Bật giọng đọc Quản trò'}
          >
            {speechEnabled ? (
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <MicOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Bật/Tắt giọng đọc ({speechEnabled ? 'Bật' : 'Tắt'})</span>
          </button>
        </div>

        {/* System Title */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-pangolin font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-100 to-purple-200 mb-4 drop-shadow-md leading-[84px]">
          MA SÓI: U HỒN TRẤN
        </h2>

        {/* 1. Lời Chào Hệ Thống Banner */}
        <div className="w-full bg-purple-950/50 border border-purple-500/40 rounded-2xl p-4 mb-3 text-left flex items-start gap-3 shadow-lg">
          <div className="p-2.5 rounded-xl bg-purple-900/80 border border-purple-400/50 text-amber-300 shrink-0 mt-0.5 shadow-inner">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1 w-full">
            <div className="font-patrick font-bold text-amber-300 text-lg sm:text-xl flex items-center justify-between tracking-wide">
              <span className="flex items-center gap-1.5">
                <span>CHÀO MỪNG</span>
                {activePartIndex === 0 && (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" title="Đang phát thông báo..." />
                )}
              </span>
            </div>
            <CollapsibleText
              text={systemWelcomeText}
              previewText={`Xác nhận: ${players.length} thành viên đã có mặt.\nXin chào! Ta là Hệ thống`}
              className="text-slate-200 font-dongle text-xl sm:text-2xl leading-none whitespace-pre-line tracking-wide"
            />
          </div>
        </div>

        {/* 2. Bối Cảnh Thị Trấn */}
        <div className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left flex items-start gap-3 shadow-lg my-3">
          <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-400 shrink-0 mt-0.5 shadow-inner">
            <Feather className="w-6 h-6" />
          </div>
          <div className="space-y-1 w-full">
            <div className="font-patrick font-bold text-amber-400 text-lg sm:text-xl flex items-center justify-between tracking-wide pb-1 border-b border-slate-800/80">
              <span className="flex items-center gap-1.5 uppercase tracking-widest">
                <span>DẪN NHẬP</span>
                {activePartIndex === 1 && (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" title="Đang phát bối cảnh..." />
                )}
              </span>
            </div>

            <CollapsibleText
              text={loreContextText}
              previewText="Hỡi những thành viên dũng cảm và mưu lược, ranh mãnh và cả tin,"
              className="text-xl sm:text-2xl text-slate-200 font-dongle leading-none whitespace-pre-line tracking-wide pt-1"
            />
          </div>
        </div>

        {/* 3. Nút Bấm Phát Thẻ Bài Bí Mật */}
        <div className="w-full mt-4 space-y-2 text-left">
          <button
            id="btn-receive-cards"
            onClick={() => {
              narrator.stop();
              soundEffects.playCardFlip();
              onProceedToCardReveal();
            }}
            className="w-full py-3.5 bg-gradient-to-r from-amber-600 via-purple-600 to-amber-600 hover:from-amber-500 hover:to-purple-500 text-white font-patrick font-bold rounded-2xl shadow-xl border border-amber-300/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 text-lg sm:text-xl tracking-wider"
          >
            <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
            <span>NHẬN THẺ BÀI</span>
          </button>
        </div>
      </div>
    </div>
  );
};

