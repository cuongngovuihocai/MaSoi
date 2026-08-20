import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { ChatMessage, NightActionRecord, Player, Room, VoteRecord } from './types';
import {
  ensureAuth,
  leaveRoom,
  subscribeToActions,
  subscribeToMessages,
  subscribeToPlayers,
  subscribeToRoom,
  subscribeToVotes,
  testConnection,
} from './services/firebase';
import { HeaderBar } from './components/HeaderBar';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { RuleGuideModal } from './components/RuleGuideModal';
import bgImage from './assets/images/werewolf_lobby_bg_1786452063215.jpg';

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [actions, setActions] = useState<NightActionRecord[]>([]);

  const [isRulesOpen, setIsRulesOpen] = useState(false);

  useEffect(() => {
    // Authenticate anonymously & test Firestore connection
    ensureAuth().catch((err) => console.error('Auth error:', err));
    testConnection();
  }, []);

  // Subscribe to room subcollections when joined
  useEffect(() => {
    if (!roomId) return;

    const unSubRoom = subscribeToRoom(roomId, (r) => setRoom(r));
    const unSubPlayers = subscribeToPlayers(roomId, (plist) => setPlayers(plist));
    const unSubMessages = subscribeToMessages(roomId, (msgs) => setMessages(msgs));
    const unSubVotes = subscribeToVotes(roomId, (vlist) => setVotes(vlist));
    const unSubActions = subscribeToActions(roomId, (alist) => setActions(alist));

    return () => {
      unSubRoom();
      unSubPlayers();
      unSubMessages();
      unSubVotes();
      unSubActions();
    };
  }, [roomId]);

  const handleRoomJoined = (rId: string, p: Player) => {
    setRoomId(rId);
    setCurrentPlayer(p);
  };

  const handleLeaveRoom = async () => {
    if (roomId && currentPlayer) {
      await leaveRoom(roomId, currentPlayer.id);
    }
    setRoomId(null);
  };

  // Auto-cleanup on browser window/tab close or navigate
  useEffect(() => {
    if (!roomId || !currentPlayer) return;

    const handleUnload = () => {
      leaveRoom(roomId, currentPlayer.id);
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [roomId, currentPlayer]);

  const myPlayerState = players.find((p) => p.id === currentPlayer?.id) || currentPlayer;

  return (
    <div
      id="app-root"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white relative bg-cover bg-center bg-no-repeat bg-fixed"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(15, 10, 30, 0.35), rgba(5, 3, 15, 0.55)), url(${bgImage})`,
      }}
    >
      {/* Header Bar */}
      <HeaderBar
        roomId={roomId || undefined}
        onOpenRules={() => setIsRulesOpen(true)}
        onLeaveRoom={roomId ? handleLeaveRoom : undefined}
      />

      {/* Main Content View */}
      <main className="flex-1 py-3 sm:py-6 px-1.5 sm:px-4 flex flex-col items-center justify-center w-full max-w-full overflow-x-hidden relative z-10">
        {!roomId || !room || !myPlayerState ? (
          <Lobby onRoomJoined={handleRoomJoined} />
        ) : (
          <GameBoard
            room={room}
            players={players}
            messages={messages}
            votes={votes}
            actions={actions}
            currentPlayer={myPlayerState}
            onLeaveRoom={handleLeaveRoom}
          />
        )}
      </main>

      {/* Footer Branding */}
      <footer id="main-footer" className="py-2.5 px-4 bg-slate-950/90 backdrop-blur-md border-t border-slate-900/80 flex items-center justify-between text-xs text-slate-400 relative z-10">
        {/* Nút hình quyển sách (Luật chơi) canh trái */}
        <button
          onClick={() => setIsRulesOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 text-purple-300 font-medium text-xs transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
          title="Luật chơi"
        >
          <BookOpen className="w-4 h-4 text-purple-400 shrink-0" />
          <span>Luật chơi</span>
        </button>

        {/* Logo Ham Chơi canh phải */}
        <a
          href="https://www.facebook.com/people/Ham-Ch%C6%A1i-Education/100081637728642/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:opacity-85 transition-opacity"
          title="Ham Chơi Education"
        >
          <img
            src="https://lh3.googleusercontent.com/d/1q6B38HJxp8PEO5qmufm3HrJ0gBv8a2Z8"
            alt="Ham Chơi Education"
            referrerPolicy="no-referrer"
            className="h-7 sm:h-8 object-contain rounded-md"
          />
        </a>
      </footer>

      {/* Rulebook & Role Encyclopedia Modal */}
      <RuleGuideModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />
    </div>
  );
}
