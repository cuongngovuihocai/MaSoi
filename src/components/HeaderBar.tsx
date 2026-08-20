import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Mic, MicOff, BookOpen, Download, Copy, Check, LogOut } from 'lucide-react';
import { narrator } from '../services/narratorEngine';

interface HeaderBarProps {
  roomId?: string;
  onOpenRules: () => void;
  onLeaveRoom?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ roomId, onOpenRules, onLeaveRoom }) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Listen for PWA install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredInstallPrompt(null);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    narrator.soundEffectsEnabled = next;
  };

  const toggleSpeech = () => {
    const next = !speechEnabled;
    setSpeechEnabled(next);
    narrator.speechEnabled = next;
    if (!next) {
      narrator.stop();
    }
  };

  const copyRoomCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const logoSrc = `${import.meta.env.BASE_URL || '/'}cards/card_back.png`.replace(/\/\//g, '/');

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/40 border-b border-purple-500/30 backdrop-blur-xl px-4 py-3 flex items-center justify-between shadow-lg shadow-purple-950/20">
      {/* Brand Title */}
      <div className="flex items-center gap-2.5 group cursor-pointer">
        <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shadow-lg shadow-purple-950/80 ring-2 ring-purple-500/40 group-hover:ring-rose-400 group-hover:scale-110 transition-all duration-300 bg-slate-950 flex items-center justify-center shrink-0">
          <img
            src={logoSrc}
            alt="Ma Sói Logo"
            className="w-full h-full object-cover scale-140 group-hover:scale-155 transition-transform duration-300 card-img-smooth"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-950/30 via-transparent to-transparent pointer-events-none" />
        </div>
        <div>
          <h1 className="font-serif font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-slate-100 to-rose-200 text-base md:text-lg tracking-tight flex items-center gap-2 group-hover:text-rose-300 transition-colors">
            Ma Sói Online
          </h1>
        </div>
      </div>

      {/* Center Room Code if in room */}
      {roomId && (
        <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-purple-500/30 shadow-inner">
          <span className="text-xs text-slate-400 font-medium">Mã Phòng:</span>
          <span className="font-mono font-bold text-purple-300 text-[30px] tracking-wider">
            {roomId}
          </span>
          <button
            onClick={copyRoomCode}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Sao chép mã phòng"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* PWA Install Button */}
        {deferredInstallPrompt && !isInstalled && (
          <button
            onClick={handleInstallPWA}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:from-purple-500 hover:to-indigo-500 transition-all border border-purple-400/30 animate-bounce"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cài Đặt App</span>
          </button>
        )}

        {/* Voice & Sound Controls - Only in game room, hidden in lobby */}
        {roomId && (
          <>
            {/* Narrator Speech Toggle */}
            <button
              onClick={toggleSpeech}
              className={`p-2 rounded-xl border transition-all ${
                speechEnabled
                  ? 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title={speechEnabled ? 'Tắt giọng nói Quản trò' : 'Bật giọng nói Quản trò'}
            >
              {speechEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            {/* Sound Effects Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl border transition-all ${
                soundEnabled
                  ? 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title={soundEnabled ? 'Tắt âm hiệu' : 'Bật âm hiệu'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Leave Room Button */}
            {onLeaveRoom && (
              <button
                onClick={onLeaveRoom}
                className="p-2 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900/80 hover:text-rose-200 transition-all flex items-center gap-1"
                title="Rời phòng"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline text-xs font-medium">Rời phòng</span>
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
};
