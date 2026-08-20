import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { ROLE_DEFINITIONS } from '../data/roles';
import { CardArt } from './CardArt';
import { RoleImageModal } from './RoleImageModal';
import { soundEffects } from '../services/audioSynthesizer';
import {
  Sparkles,
  EyeOff,
  Lock,
  CheckCircle2,
  Zap,
  Moon,
  X,
  Maximize2,
} from 'lucide-react';

interface CardRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
}

export const CardRevealModal: React.FC<CardRevealModalProps> = ({
  isOpen,
  onClose,
  player,
}) => {
  const [stage, setStage] = useState<'dealing' | 'facedown' | 'revealed'>('dealing');
  const [isFlipping, setIsFlipping] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const roleMeta = ROLE_DEFINITIONS[player.role] || ROLE_DEFINITIONS.villager;

  useEffect(() => {
    if (isOpen) {
      setStage('dealing');
      setIsFlipping(false);
      soundEffects.playCardFlip();

      // Auto transition from dealing to facedown after 1.5 seconds
      const timer = setTimeout(() => {
        setStage('facedown');
        soundEffects.playMysticSound();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFlipCard = () => {
    if (stage !== 'facedown' || isFlipping) return;
    setIsFlipping(true);
    soundEffects.playCardFlip();

    setTimeout(() => {
      setStage('revealed');
      setIsFlipping(false);

      if (player.role.includes('wolf')) {
        soundEffects.playHowl();
      } else {
        soundEffects.playChimeBell();
      }
    }, 350);
  };

  return (
    <div
      id="card-reveal-overlay"
      onClick={(e) => {
        // Tap outside modal content to close if needed
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in overflow-hidden"
    >
      <div className="relative w-full max-w-[calc(100vw-1.25rem)] sm:max-w-md bg-slate-900 border border-purple-500/30 rounded-2xl p-4 sm:p-6 shadow-2xl overflow-y-auto overflow-x-hidden max-h-[88vh] text-center flex flex-col items-center">
        {/* Background Magical Particle Effects - Clipped properly */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute -top-20 -left-20 w-48 h-48 bg-purple-600/15 rounded-full blur-2xl" />
          <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-rose-600/15 rounded-full blur-2xl" />
        </div>

        {/* Always visible Top-Right Close Button for Mobile Safety */}

        {/* Top Header */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
          <span>VAI TRÒ BÍ MẬT CỦA BẠN</span>
        </div>

        {/* Stage 1: Dealing Cards Animation */}
        {stage === 'dealing' && (
          <div className="flex flex-col items-center justify-center py-6 my-2 space-y-4">
            <div className="relative w-28 h-36 flex items-center justify-center">
              <div className="absolute w-24 h-32 bg-purple-900/60 border border-purple-500/40 rounded-xl transform -rotate-12 translate-x-2 -translate-y-2 shadow-lg animate-pulse" />
              <div className="absolute w-24 h-32 bg-indigo-900/60 border border-indigo-500/40 rounded-xl transform rotate-6 -translate-x-2 translate-y-1 shadow-lg" />
              <div className="relative w-24 h-32 bg-gradient-to-br from-purple-900 via-slate-900 to-indigo-950 border-2 border-purple-400 rounded-xl shadow-2xl flex flex-col items-center justify-center animate-bounce">
                <Moon className="w-8 h-8 text-purple-300 animate-pulse" />
                <span className="text-[9px] uppercase font-bold text-purple-300 mt-1 tracking-widest">
                  MA SÓI
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white tracking-wide">
                Đang chia thẻ bài bí mật...
              </h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Mỗi lá bài mang một định mệnh riêng. Vui lòng giữ kín vai trò!
              </p>
            </div>
          </div>
        )}

        {/* Stage 2: Face Down Card - Click to reveal */}
        {stage === 'facedown' && (
          <div className="flex flex-col items-center my-1 space-y-3 animate-fade-in w-full">
            <div className="text-center space-y-0.5">
              <h3 className="text-lg font-serif font-bold text-amber-200 flex items-center justify-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-400" /> Thẻ Bài Đã Đến
              </h3>
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <EyeOff className="w-3.5 h-3.5 text-rose-400" /> Cẩn thận kẻo có người nhìn lén!
              </p>
            </div>

            {/* Interactive 3D Card */}
            <div
              id="interactive-secret-card"
              onClick={handleFlipCard}
              className={`group relative cursor-pointer my-2 transform transition-transform duration-300 hover:scale-105 ${
                isFlipping ? 'animate-flip-3d' : ''
              }`}
            >
              <CardArt
                role={player.role}
                isRevealed={false}
                size="md"
                className="ring-2 ring-purple-500/40 group-hover:ring-purple-400/80 shadow-purple-950/80 shadow-xl"
              />

              {/* Glowing overlay text prompt */}
              <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
                <span className="px-2.5 py-1 rounded-full bg-purple-900/90 border border-purple-300/60 text-purple-100 text-[10px] font-bold tracking-wider uppercase shadow-lg animate-pulse flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" /> CHẠM ĐỂ LẬT
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stage 3: Revealed Secret Role */}
        {stage === 'revealed' && (
          <div className="flex flex-col items-center my-1 space-y-3 animate-fade-in w-full">
            <div className="text-center space-y-0.5">
              <h3 className="text-xl font-serif font-extrabold text-white flex items-center justify-center gap-2">
                <span className="text-amber-300">{roleMeta.name}</span>
              </h3>
            </div>

            {/* Revealed Card - Compact size="md" for mobile safety with click to zoom */}
            <div
              onClick={() => setIsZoomed(true)}
              className="my-1 transform transition-all duration-300 cursor-pointer group relative rounded-xl overflow-hidden"
              title="Chạm để xem hình phóng to"
            >
              <CardArt
                role={player.role}
                isRevealed={true}
                size="md"
                showDetails={false}
                className="ring-2 ring-emerald-500/40 shadow-emerald-950/60 group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-transparent transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              </div>
            </div>

            {/* Description & Win Condition Box */}
            <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left text-xs space-y-1.5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Kỹ Năng:
                </span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${roleMeta.badgeColor}`}>
                  {roleMeta.teamName}
                </span>
              </div>
              <p className="text-slate-200 leading-relaxed text-[11px]">{roleMeta.ability}</p>
            </div>

            {/* Sticky/Prominent Confirmation Action Button */}
            <button
              id="btn-confirm-role-acknowledged"
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold rounded-xl shadow-lg border border-emerald-400/30 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Đã Ghi Nhớ • Vào Trận Đấu
            </button>
          </div>
        )}
      </div>

      {/* Role Image Zoom Lightbox Modal */}
      <RoleImageModal
        role={isZoomed ? player.role : null}
        onClose={() => setIsZoomed(false)}
      />
    </div>
  );
};
