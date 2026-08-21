import React, { useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Download,
  Copy,
  Check,
  LogOut,
  Zap,
  Settings,
  X,
  Volume1,
  Sparkles,
} from 'lucide-react';
import { narrator } from '../services/narratorEngine';

interface HeaderBarProps {
  roomId?: string;
  onOpenRules: () => void;
  onLeaveRoom?: () => void;
}

const SPEED_OPTIONS = [
  { value: 1.0, label: '1.0x', desc: 'Chuẩn' },
  { value: 1.25, label: '1.25x', desc: 'Mặc định' },
  { value: 1.4, label: '1.4x', desc: 'Nhanh' },
  { value: 1.6, label: '1.6x', desc: 'Siêu tốc' },
];

export const HeaderBar: React.FC<HeaderBarProps> = ({ roomId, onOpenRules, onLeaveRoom }) => {
  const [soundEnabled, setSoundEnabled] = useState(narrator.soundEffectsEnabled);
  const [speechEnabled, setSpeechEnabled] = useState(narrator.speechEnabled);
  const [speechRate, setSpeechRate] = useState(narrator.speechRate || 1.25);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const settingsRef = useRef<HTMLDivElement>(null);

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

  // Handle clicking outside the settings dropdown to close it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

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
    if (next) {
      narrator.unlock();
    }
  };

  const toggleSpeech = () => {
    const next = !speechEnabled;
    setSpeechEnabled(next);
    narrator.speechEnabled = next;
    if (next) {
      narrator.unlock();
      narrator.speak('Lời dẫn quản trò đã kích hoạt', 'chime', 1000, undefined, undefined, true);
    } else {
      narrator.stop();
    }
  };

  const handleSelectSpeed = (rate: number) => {
    setSpeechRate(rate);
    narrator.setSpeed(rate);
    narrator.unlock();
    if (speechEnabled) {
      narrator.speak(`Tốc độ ${rate}x`, 'chime', 800, undefined, undefined, true);
    }
  };

  const handleTestVoice = () => {
    narrator.unlock();
    setIsTestingVoice(true);
    narrator.speak('Chào mừng bạn đến với Ma Sói Online. Đêm đã buông xuống!', 'howl', 1000, undefined, undefined, true);
    setTimeout(() => setIsTestingVoice(false), 3000);
  };

  const copyRoomCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const logoSrc = `${import.meta.env.BASE_URL || '/'}cards/card_back.png`.replace(/\/\//g, '/');

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/70 border-b border-purple-500/30 backdrop-blur-xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shadow-lg shadow-purple-950/20">
      {/* Brand Title */}
      <div className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer">
        <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden shadow-lg shadow-purple-950/80 ring-2 ring-purple-500/40 group-hover:ring-rose-400 group-hover:scale-105 transition-all duration-300 bg-slate-950 flex items-center justify-center shrink-0">
          <img
            src={logoSrc}
            alt="Ma Sói Logo"
            className="w-full h-full object-cover scale-140 group-hover:scale-155 transition-transform duration-300 card-img-smooth"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-950/30 via-transparent to-transparent pointer-events-none" />
        </div>
        <div>
          <h1 className="font-serif font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-slate-100 to-rose-200 text-sm sm:text-base md:text-lg tracking-tight flex items-center gap-2 group-hover:text-rose-300 transition-colors">
            Ma Sói Online
          </h1>
        </div>
      </div>

      {/* Center Room Code if in room */}
      {roomId && (
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 px-2.5 sm:px-3 py-1 rounded-xl border border-purple-500/30 shadow-inner">
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium hidden xs:inline">Mã Phòng:</span>
          <span className="font-mono font-bold text-purple-300 text-sm sm:text-base md:text-lg tracking-wider">
            {roomId}
          </span>
          <button
            onClick={copyRoomCode}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Sao chép mã phòng"
          >
            {copied ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>
      )}

      {/* Right Controls Container */}
      <div className="flex items-center gap-1.5 sm:gap-2 relative" ref={settingsRef}>
        {/* PWA Install Button */}
        {deferredInstallPrompt && !isInstalled && (
          <button
            onClick={handleInstallPWA}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:from-purple-500 hover:to-indigo-500 transition-all border border-purple-400/30 animate-bounce"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cài Đặt App</span>
          </button>
        )}

        {/* Tùy Chỉnh (Settings) Button */}
        <button
          id="btn-open-settings"
          onClick={() => setIsSettingsOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all text-xs font-medium ${
            isSettingsOpen
              ? 'bg-purple-900/80 border-purple-400 text-purple-100 shadow-md shadow-purple-900/40 ring-2 ring-purple-500/40'
              : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-700/80 text-slate-200 hover:border-purple-500/50'
          }`}
          title="Tùy chỉnh âm thanh, giọng đọc Quản trò và tốc độ"
        >
          <Settings className={`w-4 h-4 text-purple-300 ${isSettingsOpen ? 'rotate-45' : ''} transition-transform duration-200`} />
          <span className="hidden sm:inline font-sans">Tùy chỉnh</span>
        </button>

        {/* Leave Room Button */}
        {roomId && onLeaveRoom && (
          <button
            onClick={onLeaveRoom}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900/80 hover:text-rose-200 transition-all flex items-center gap-1 text-xs font-medium"
            title="Rời phòng"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Rời phòng</span>
          </button>
        )}

        {/* Settings Popover Dropdown Panel */}
        {isSettingsOpen && (
          <div
            id="settings-dropdown-panel"
            className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] xs:w-84 sm:w-96 bg-slate-900/95 border border-purple-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-2xl z-50 text-slate-100 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-500/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-950/80 border border-purple-500/30 text-purple-300">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-100">Tùy Chỉnh Âm Thanh</h3>
                  <p className="text-[11px] text-slate-400">Cài đặt giọng đọc Quản trò & hiệu ứng</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Option 1: Giọng đọc Quản trò */}
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800 hover:border-purple-500/30 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-xl transition-colors ${
                      speechEnabled
                        ? 'bg-purple-950/90 border border-purple-500/50 text-purple-300'
                        : 'bg-slate-900 border border-slate-800 text-slate-500'
                    }`}
                  >
                    {speechEnabled ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Giọng đọc Quản trò</div>
                    <div className="text-[11px] text-slate-400">Dẫn truyện & gọi dậy từng chức năng</div>
                  </div>
                </div>

                <button
                  onClick={toggleSpeech}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    speechEnabled
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/80 shadow-sm shadow-emerald-950'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {speechEnabled ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                </button>
              </div>

              {/* Option 2: Tốc độ đọc */}
              <div className={`bg-slate-950/60 p-3 rounded-xl border border-slate-800 transition-opacity ${speechEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-semibold text-slate-200">Tốc độ đọc giọng nói</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md">
                    {speechRate}x
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {SPEED_OPTIONS.map((opt) => {
                    const isSelected = speechRate === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleSelectSpeed(opt.value)}
                        className={`py-1.5 px-1 rounded-lg text-xs font-medium transition-all flex flex-col items-center justify-center border ${
                          isSelected
                            ? 'bg-amber-950/90 border-amber-400 text-amber-200 font-bold shadow-sm shadow-amber-950 ring-1 ring-amber-400/40'
                            : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <span className="font-mono text-xs">{opt.label}</span>
                        <span className="text-[9px] text-slate-400">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Option 3: Hiệu ứng âm thanh */}
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800 hover:border-purple-500/30 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-xl transition-colors ${
                      soundEnabled
                        ? 'bg-indigo-950/90 border border-indigo-500/50 text-indigo-300'
                        : 'bg-slate-900 border border-slate-800 text-slate-500'
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Hiệu ứng âm thanh</div>
                    <div className="text-[11px] text-slate-400">Tiếng sói hú, gõ búa, chuông báo</div>
                  </div>
                </div>

                <button
                  onClick={toggleSound}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    soundEnabled
                      ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300 hover:bg-indigo-900/80 shadow-sm shadow-indigo-950'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {soundEnabled ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                </button>
              </div>

              {/* Quick Test Voice Button */}
              {speechEnabled && (
                <div className="pt-1">
                  <button
                    onClick={handleTestVoice}
                    disabled={isTestingVoice}
                    className="w-full py-2 px-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/30 text-purple-200 text-xs font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    <Volume1 className={`w-4 h-4 text-purple-400 ${isTestingVoice ? 'animate-pulse' : ''}`} />
                    <span>{isTestingVoice ? 'Đang phát thử giọng...' : 'Nghe thử giọng Quản trò'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
