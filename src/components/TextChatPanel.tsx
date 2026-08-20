import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, Player } from '../types';
import { sendChatMessage } from '../services/firebase';
import { VoiceChatBar } from './VoiceChatBar';
import { MessageSquare, Volume2, ShieldAlert, Ghost, Send, Mic } from 'lucide-react';

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
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const filteredMessages = messages.filter((m) => {
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
  });

  const playVoiceClip = (audioDataUri?: string | null) => {
    if (!audioDataUri) return;
    const audio = new Audio(audioDataUri);
    audio.play().catch((e) => console.warn('Audio play blocked:', e));
  };

  return (
    <div id="text-chat-panel" className="flex flex-col h-full bg-slate-900 border border-purple-500/20 rounded-2xl overflow-hidden shadow-2xl">
      {/* Channel Tabs */}
      <div className="flex items-center gap-1 p-2 bg-slate-950 border-b border-slate-800">
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

      {/* Messages List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            Chưa có tin nhắn nào trong kênh này...
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.senderId === currentPlayer.id;
            const isSystem = msg.type === 'system' || msg.type === 'narrator';

            if (isSystem) {
              return (
                <div
                  key={msg.id}
                  className="p-2 rounded-xl bg-purple-950/30 border border-purple-500/20 text-purple-300 text-[11px] italic text-center"
                >
                  📣 Quản trò: {msg.content}
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="text-[10px] text-slate-400 font-medium mb-0.5 px-1">
                  {msg.senderName} {msg.senderRole ? `(${msg.senderRole})` : ''}
                </div>

                <div
                  className={`p-2.5 rounded-2xl max-w-[85%] break-words shadow-md ${
                    isMe
                      ? 'bg-purple-600 text-white rounded-tr-none'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
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
        <div ref={chatEndRef} />
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
