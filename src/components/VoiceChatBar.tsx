import React, { useState } from 'react';
import { Mic, MicOff, Send, Volume2, Square } from 'lucide-react';
import { voiceRecorder } from '../services/voiceChat';
import { sendChatMessage } from '../services/firebase';

interface VoiceChatBarProps {
  roomId: string;
  senderId: string;
  senderName: string;
  channel: 'global' | 'werewolf' | 'ghost';
  disabled?: boolean;
}

export const VoiceChatBar: React.FC<VoiceChatBarProps> = ({
  roomId,
  senderId,
  senderName,
  channel,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [timerId, setTimerId] = useState<any>(null);

  const startRecord = async () => {
    if (disabled) return;
    const ok = await voiceRecorder.startRecording();
    if (ok) {
      setIsRecording(true);
      setRecordTime(0);
      const tid = setInterval(() => {
        setRecordTime((prev) => {
          if (prev >= 15) {
            stopRecord(); // Auto stop at 15s max
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
      setTimerId(tid);
    }
  };

  const stopRecord = async () => {
    if (timerId) clearInterval(timerId);
    setTimerId(null);

    const audioUri = await voiceRecorder.stopRecording();
    setIsRecording(false);

    if (audioUri) {
      await sendChatMessage(roomId, {
        senderId,
        senderName,
        content: '🎤 Tin nhắn giọng nói (' + recordTime + 's)',
        channel,
        type: 'voice',
        audioDataUri: audioUri,
        createdAt: Date.now(),
      });
    }
  };

  const cancelRecord = () => {
    if (timerId) clearInterval(timerId);
    setTimerId(null);
    voiceRecorder.cancelRecording();
    setIsRecording(false);
  };

  return (
    <div id="voice-chat-bar" className="p-2 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-2">
      {isRecording ? (
        <div className="flex-1 flex items-center justify-between px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 animate-pulse">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>Đang ghi âm giọng nói... ({recordTime}s / 15s)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cancelRecord}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900"
            >
              Hủy
            </button>
            <button
              onClick={stopRecord}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-rose-600 text-white flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" /> Gửi
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startRecord}
          disabled={disabled}
          className={`w-full py-2 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all border shadow-md ${
            disabled
              ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-900/80 to-indigo-900/80 border-purple-500/30 text-purple-200 hover:from-purple-800 hover:to-indigo-800'
          }`}
        >
          <Mic className="w-4 h-4 text-purple-400" />
          <span>Ghi Âm Nói Trực Tiếp (Push-To-Talk Voice)</span>
        </button>
      )}
    </div>
  );
};
