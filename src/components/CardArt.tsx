import React from 'react';
import { ROLE_DEFINITIONS } from '../data/roles';
import { RoleType } from '../types';
import {
  User,
  Eye,
  Shield,
  Sparkles,
  Target,
  Crown,
  Heart,
  Feather,
  Music,
  Moon,
  Skull,
  Zap,
  Smile,
  Sparkle,
  Swords,
  Ghost,
  HeartHandshake,
  Compass,
  Users,
  Gavel,
  Flame,
  HelpCircle,
} from 'lucide-react';

interface CardArtProps {
  role: RoleType;
  isRevealed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  onClick?: () => void;
  className?: string;
  isFlipped?: boolean;
}

export const CardArt: React.FC<CardArtProps> = ({
  role,
  isRevealed = true,
  size = 'md',
  showDetails = false,
  onClick,
  className = '',
  isFlipped = false,
}) => {
  const roleMeta = ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.villager;
  const [imgError, setImgError] = React.useState(false);
  const [backImgError, setBackImgError] = React.useState(false);

  const getCardPath = (filename: string) => {
    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    return `${cleanBase}cards/${filename}`;
  };

  // Dynamic image source with random villager male/female variant & fallback
  const [currentImgSrc, setCurrentImgSrc] = React.useState(() => {
    if (role === 'villager') {
      return Math.random() < 0.5 ? getCardPath('villager.png') : getCardPath('villager_fm.png');
    }
    return getCardPath(`${role}.png`);
  });

  // Re-sync image source if role prop changes
  React.useEffect(() => {
    setImgError(false);
    if (role === 'villager') {
      setCurrentImgSrc(Math.random() < 0.5 ? getCardPath('villager.png') : getCardPath('villager_fm.png'));
    } else {
      setCurrentImgSrc(getCardPath(`${role}.png`));
    }
  }, [role]);

  const handleImgError = () => {
    if (role === 'villager' && currentImgSrc === getCardPath('villager_fm.png')) {
      setCurrentImgSrc(getCardPath('villager.png'));
    } else {
      setImgError(true);
    }
  };

  // Render Icon component dynamically
  const getIcon = () => {
    switch (roleMeta.iconName) {
      case 'Eye': return <Eye className="w-full h-full text-indigo-300" />;
      case 'Shield': return <Shield className="w-full h-full text-blue-300" />;
      case 'Sparkles': return <Sparkles className="w-full h-full text-purple-300" />;
      case 'Target': return <Target className="w-full h-full text-amber-300" />;
      case 'Crown': return <Crown className="w-full h-full text-yellow-300" />;
      case 'Heart': return <Heart className="w-full h-full text-pink-300" />;
      case 'Feather': return <Feather className="w-full h-full text-orange-300" />;
      case 'Music': return <Music className="w-full h-full text-teal-300" />;
      case 'Moon': return <Moon className="w-full h-full text-slate-100" />;
      case 'Skull': return <Skull className="w-full h-full text-rose-300" />;
      case 'Zap': return <Zap className="w-full h-full text-red-300" />;
      case 'Smile': return <Smile className="w-full h-full text-emerald-300" />;
      case 'Sparkle': return <Sparkle className="w-full h-full text-sky-300" />;
      case 'Swords': return <Swords className="w-full h-full text-cyan-300" />;
      case 'Ghost': return <Ghost className="w-full h-full text-stone-300" />;
      case 'HeartHandshake': return <HeartHandshake className="w-full h-full text-rose-300" />;
      case 'Compass': return <Compass className="w-full h-full text-amber-300" />;
      case 'Users': return <Users className="w-full h-full text-emerald-300" />;
      case 'Gavel': return <Gavel className="w-full h-full text-indigo-300" />;
      case 'Flame': return <Flame className="w-full h-full text-lime-300" />;
      case 'Wolf':
        return (
          <svg className="w-full h-full text-rose-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L9 8L3 10L7 15L6 22L12 18L18 22L17 15L21 10L15 8L12 2Z" />
          </svg>
        );
      default:
        return <User className="w-full h-full text-emerald-300" />;
    }
  };

  const dimensions = {
    sm: 'w-20 h-28 text-xs',
    md: 'w-36 h-52 text-sm',
    lg: 'w-56 h-80 text-base',
  }[size];

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  }[size];

  if (!isRevealed || isFlipped) {
    // Hidden Card Back
    return (
      <div
        id={`card-back-${role}`}
        onClick={onClick}
        className={`${dimensions} relative rounded-xl border-2 border-purple-500/40 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-2 shadow-xl flex flex-col items-center justify-center cursor-pointer transform hover:scale-105 transition-all duration-300 group overflow-hidden ${className}`}
      >
        {!backImgError ? (
          <img
            src={getCardPath('card_back.png')}
            alt="Mặt lưng"
            onError={() => setBackImgError(true)}
            className="absolute inset-0 w-full h-full object-cover rounded-lg z-0 card-img-smooth"
          />
        ) : (
          <div className="w-full h-full border border-purple-500/30 rounded-lg flex flex-col items-center justify-center p-2 relative z-10">
            <div className="w-10 h-10 rounded-full bg-purple-900/50 border border-purple-400/40 flex items-center justify-center mb-2 shadow-inner">
              <Moon className="w-6 h-6 text-purple-300 animate-pulse" />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-purple-300/80 drop-shadow-md">
              MA SÓI
            </span>
            <div className="absolute bottom-2 text-[9px] text-slate-400/60 font-mono">
              ? ? ?
            </div>
          </div>
        )}
      </div>
    );
  }

  // Team background themes
  const teamTheme = {
    werewolves: 'from-slate-900 via-rose-950 to-slate-900 border-rose-500/50 shadow-rose-950/50',
    villagers: 'from-slate-900 via-emerald-950 to-slate-900 border-emerald-500/50 shadow-emerald-950/50',
    neutral: 'from-slate-900 via-amber-950 to-slate-900 border-amber-500/50 shadow-amber-950/50',
  }[roleMeta.team];

  return (
    <div
      id={`card-front-${role}`}
      onClick={onClick}
      className={`${dimensions} relative rounded-xl border-2 bg-gradient-to-br ${teamTheme} p-3 shadow-2xl flex flex-col items-center justify-between cursor-pointer transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 group overflow-hidden ${className}`}
    >
      {/* Custom Full Card Image */}
      {!imgError ? (
        <img
          src={currentImgSrc}
          alt={roleMeta.name}
          onError={handleImgError}
          className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-100 z-0 card-img-smooth"
        />
      ) : null}

      {/* Mystical Background Glow (Fallback) */}
      {imgError && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none z-0" />
      )}

      {/* Header Team Tag (Fallback) */}
      {imgError && (
        <div className="w-full flex items-center justify-between z-10">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-md shadow-md ${roleMeta.badgeColor}`}
          >
            {roleMeta.teamName}
          </span>
          <div className="w-2 h-2 rounded-full bg-purple-400/80 animate-ping" />
        </div>
      )}

      {/* Cute Cartoon Illustration Icon Area & Role Name (Fallback) */}
      {imgError && (
        <div className="relative my-auto flex flex-col items-center justify-center z-10">
          <div className={`${iconSizes} p-3 rounded-2xl bg-slate-950/60 border border-white/10 shadow-inner flex items-center justify-center transform group-hover:rotate-3 transition-transform duration-300`}>
            {getIcon()}
          </div>

          <h4 className="mt-2 font-serif font-extrabold text-center text-slate-100 tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] bg-slate-950/60 px-2.5 py-0.5 rounded-lg border border-white/10 backdrop-blur-sm">
            {roleMeta.name}
          </h4>
        </div>
      )}

      {/* Optional details block */}
      {showDetails && (
        <div className="w-full z-10 text-[11px] text-slate-300 bg-slate-950/85 p-2 rounded-lg border border-white/10 backdrop-blur-sm line-clamp-3">
          {roleMeta.ability}
        </div>
      )}

      {/* Bottom decorative bar (Fallback) */}
      {imgError && (
        <div className="w-full text-[9px] text-slate-300 text-center tracking-widest font-mono z-10 border-t border-white/10 pt-1 bg-slate-950/60 rounded-b-lg backdrop-blur-sm">
          NIGHT PRIORITY #{roleMeta.nightPriority}
        </div>
      )}
    </div>
  );
};
