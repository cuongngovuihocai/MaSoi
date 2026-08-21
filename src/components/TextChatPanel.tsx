import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, Player } from '../types';
import { clearRoomMessages, sendChatMessage } from '../services/firebase';
import { VoiceChatBar } from './VoiceChatBar';
import { MessageSquare, Volume2, ShieldAlert, Ghost, Send, ArrowDownUp, Clock, Trash2 } from 'lucide-react';

interface TextChatPanelProps {
  roomId: string;
  messages: ChatMessage[];
  currentPlayer: Player;
  isNight: boolean;
}

export const TextChatPanel: React.FC<TextChatPanelProps> = ({
  roomId,
  messages,
  currentPlayer,
  isNight,
}) => {
  const [activeChannel, setActiveChannel] = useState<'global' | 'werewolf' | 'ghost'>(
    !currentPlayer.isAlive ? 'ghost' : 'global'
  );
  const [inputText, setInputText] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const isWerewolf = currentPlayer.role.includes('wolf') || currentPlayer.team === 'werewolves';
  const isDead = !currentPlayer.isAlive;

  const isChatDisabled =
    (isDead && activeChannel !== 'ghost') ||
    (!isDead && activeChannel === 'ghost') ||
    (isNight && activeChannel === 'global') ||
    (activeChannel === 'werewolf' && (!isWerewolf || isDead));

  let inputPlaceholder = 'Nhập tin nhắn trò chuyện...';
  if (isDead && activeChannel !== 'ghost') {
    inputPlaceholder = 'Thành viên đã chết không thể chat ở kênh này - Vui lòng sang chat Tâm Linh';
  } else if (!isDead && activeChannel === 'ghost') {
    inputPlaceholder = 'Chỉ người chơi đã chết mới có thể trò chuyện ở đây...';
  } else if (isNight && activeChannel === 'global') {
    inputPlaceholder = 'Đêm tối - Dân làng hãy giữ im lặng...';
  } else if (activeChannel === 'werewolf' && !isWerewolf) {
    inputPlaceholder = 'Chỉ Ma Sói còn sống mới có quyền trò chuyện ở đây...';
  }

  // Auto switch dead players to ghost channel, and active werewolves during night to werewolf channel
  useEffect(() => {
    if (isDead) {
      setActiveChannel('ghost');
    } else if (isNight && isWerewolf && activeChannel === 'global') {
      setActiveChannel('werewolf');
    } else if (!isNight && activeChannel === 'werewolf') {
      setActiveChannel('global');
    }
  }, [isDead, isNight, isWerewolf]);

  // Scroll to top when new messages arrive so the newest message is always visible instantly
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [messages, activeChannel]);

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isChatDisabled) return;

    const content = inputText.trim();
    setInputText('');

    await sendChatMessage(roomId, {
      senderId: currentPlayer.id,
      senderName: currentPlayer.name,
      senderRole: isWerewolf && activeChannel === 'werewolf' ? 'Ma Sói' : undefined,
      content,
      channel: activeChannel,
      type: 'text',
      createdAt: Date.now(),
    });
  };

  const filteredMessages = messages
    .filter((m) => {
      // Security check: non-werewolves cannot view werewolf channel messages
      if (m.channel === 'werewolf' && !isWerewolf) {
        return false;
      }
      // Security check: alive players cannot view ghost channel messages
      if (m.channel === 'ghost' && !isDead) {
        return false;
      }

      // Tab filter: only display messages meant for the currently active tab
      return m.channel === activeChannel;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); // Newest first (descending by time)

  const playVoiceClip = (audioDataUri?: string | null) => {
    if (!audioDataUri) return;
    const audio = new Audio(audioDataUri);
    audio.play().catch((e) => console.warn('Audio play blocked:', e));
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleClearChat = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử tin nhắn trong phòng này?')) {
      await clearRoomMessages(roomId);
    }
  };

  return (
    <div id="text-chat-panel" className="flex flex-col h-full bg-slate-900 border border-purple-500/20 rounded-2xl overflow-hidden shadow-2xl">
      {/* Channel Tabs & Sort Indicator */}
      <div className="flex flex-col bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-1 p-2">
          <button
            onClick={() => setActiveChannel('global')}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeChannel === 'global'
                ? 'bg-purple-900/60 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Kênh Làng
          </button>

          {isWerewolf && (
            <button
              onClick={() => setActiveChannel('werewolf')}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeChannel === 'werewolf'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                  : 'text-rose-400/60 hover:text-rose-300'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Hang Sói
            </button>
          )}

          {isDead && (
            <button
              onClick={() => setActiveChannel('ghost')}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeChannel === 'ghost'
                  ? 'bg-stone-900 text-purple-300 border border-purple-500/50'
                  : 'text-purple-400/70 hover:text-purple-300'
              }`}
            >
              <Ghost className="w-3.5 h-3.5" /> Kênh Tâm Linh
            </button>
          )}
        </div>

        <div className="px-2.5 py-1 bg-slate-900/60 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1 text-purple-400 font-semibold">
            <ArrowDownUp className="w-3 h-3 text-amber-400" />
            <span>Mới nhất ở trên cùng</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-500">
              {filteredMessages.length} tin nhắn
            </span>
            {currentPlayer.isHost && (
              <button
                type="button"
                onClick={handleClearChat}
                title="Xóa toàn bộ tin nhắn trong phòng"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/50 transition-colors"
              >
                <Trash2 className="w-2.5 h-2.5" />
                <span>Xoá chat</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages List - Newest on Top */}
      <div ref={chatContainerRef} className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            Chưa có tin nhắn nào trong kênh này...
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isMe = msg.senderId === currentPlayer.id;
            const isSystem = msg.type === 'system' || msg.type === 'narrator';
            const isNewest = index === 0;

            if (isSystem) {
              return (
                <div
                  key={msg.id}
                  className={`p-2.5 rounded-xl border text-[11px] text-center space-y-1 transition-all ${
                    isNewest
                      ? 'bg-purple-950/60 border-purple-400/50 text-purple-200 shadow-md ring-1 ring-purple-500/30'
                      : 'bg-purple-950/30 border-purple-500/20 text-purple-300 italic'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 font-bold text-[10px] text-amber-300">
                    <span>📣 QUẢN TRÒ</span>
                    {msg.createdAt && (
                      <span className="font-mono text-[9px] text-slate-400 font-normal">
                        ({formatTime(msg.createdAt)})
                      </span>
                    )}
                    {isNewest && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-extrabold text-[8px] uppercase tracking-wider">
                        Mới
                      </span>
                    )}
                  </div>
                  <div>{msg.content}</div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mb-0.5 px-1">
                  <span className={isMe ? 'text-purple-300 font-bold' : 'text-slate-300'}>
                    {msg.senderName} {msg.senderRole ? `(${msg.senderRole})` : ''}
                  </span>
                  {msg.createdAt && (
                    <span className="font-mono text-[9px] text-slate-500 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTime(msg.createdAt)}
                    </span>
                  )}
                  {isNewest && (
                    <span className="px-1 py-0.2 rounded bg-purple-500 text-white font-extrabold text-[8px]">
                      MỚI
                    </span>
                  )}
                </div>

                <div
                  className={`p-2.5 rounded-2xl max-w-[85%] break-words shadow-md transition-all ${
                    isMe
                      ? `bg-purple-600 text-white rounded-tr-none ${
                          isNewest ? 'ring-2 ring-purple-400/50 shadow-purple-900/50' : ''
                        }`
                      : `bg-slate-950 border text-slate-200 rounded-tl-none ${
                          isNewest
                            ? 'border-purple-500/60 ring-1 ring-purple-500/30 bg-slate-900'
                            : 'border-slate-800'
                        }`
                  }`}
                >
                  {msg.type === 'voice' ? (
                    <button
                      onClick={() => playVoiceClip(msg.audioDataUri)}
                      className="flex items-center gap-2 font-semibold text-xs hover:opacity-90"
                    >
                      <Volume2 className="w-4 h-4 animate-bounce" />
                      <span>{msg.content}</span>
                    </button>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Push-To-Talk Voice recorder */}
      <VoiceChatBar
        roomId={roomId}
        senderId={currentPlayer.id}
        senderName={currentPlayer.name}
        channel={activeChannel}
        disabled={isChatDisabled}
      />

      {/* Text Input Form */}
      <form
        onSubmit={handleSendText}
        className="p-2 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={inputPlaceholder}
          disabled={isChatDisabled}
          className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isChatDisabled}
          className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
