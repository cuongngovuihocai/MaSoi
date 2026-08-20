import React, { useEffect } from 'react';
import { RoleType } from '../types';
import { ROLE_DEFINITIONS } from '../data/roles';
import { CardArt } from './CardArt';
import { X, Sparkles, Shield, Eye, Moon, Zap } from 'lucide-react';

interface RoleImageModalProps {
  role: RoleType | null;
  onClose: () => void;
}

export const RoleImageModal: React.FC<RoleImageModalProps> = ({ role, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!role) return null;

  const roleMeta = ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.villager;

  return (
    <div
      id="role-image-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="role-image-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[92vw] sm:max-w-md md:max-w-lg max-h-[92vh] bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-purple-500/50 rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-col items-center overflow-y-auto animate-scale-up text-center border-purple-500/30"
      >
        {/* Corner Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Đóng hình phóng to"
          className="absolute top-3 right-3 z-20 p-2 bg-slate-950/80 hover:bg-rose-950/90 text-slate-300 hover:text-white rounded-full border border-slate-700 hover:border-rose-500/60 transition-all shadow-lg focus:outline-none group"
        >
          <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        {/* Modal Top Header */}
        <div className="flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>CHI TIẾT THẺ VAI TRÒ</span>
        </div>

        {/* Enlarged Responsive Card Container */}
        <div className="relative group flex items-center justify-center my-2 p-2 rounded-2xl bg-slate-950/60 border border-slate-800 shadow-2xl max-w-full">
          <div className="transform transition-transform duration-300 hover:scale-[1.02]">
            <CardArt
              role={role}
              size="lg"
              className="!w-48 !h-72 sm:!w-60 sm:!h-90 md:!w-64 md:!h-[24rem] shadow-2xl border-2 border-purple-400/40 rounded-xl"
            />
          </div>
        </div>

        {/* Role Title and Team Badge */}
        <div className="mt-3 space-y-1.5 w-full flex flex-col items-center">
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-extrabold text-xl sm:text-2xl text-slate-100 tracking-wide">
              {roleMeta.name}
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border shadow-sm ${roleMeta.badgeColor}`}
            >
              {roleMeta.teamName}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>Thứ tự hành động đêm: #{roleMeta.nightPriority}</span>
          </div>
        </div>

        {/* Role Ability / Description Box */}
        <div className="mt-4 w-full p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/80 text-slate-200 text-xs sm:text-sm leading-relaxed text-left shadow-inner">
          <p className="text-slate-300">
            <strong className="text-purple-300 font-semibold block mb-1">
              ✨ Năng lực đặc biệt:
            </strong>
            {roleMeta.ability}
          </p>
        </div>

        <p className="mt-3 text-[11px] text-slate-500 italic">
          (Nhấn vào nút ✕ hoặc bấm ra ngoài khung hình để đóng)
        </p>
      </div>
    </div>
  );
};
