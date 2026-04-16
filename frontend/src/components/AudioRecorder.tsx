import { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onRecorded: (blob: Blob) => void;
  disabled?: boolean;
}

export function AudioRecorder({ onRecorded, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval>>();

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        if (blob.size > 0) onRecorded(blob);
      };
      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
      setDuration(0);
      timer.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      alert('Não foi possível acessar o microfone.');
    }
  };

  const stop = () => {
    mediaRecorder.current?.stop();
    mediaRecorder.current = null;
    setRecording(false);
    if (timer.current) clearInterval(timer.current);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-xs text-destructive font-medium tabular-nums">{formatTime(duration)}</span>
        <button onClick={stop} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
          <Square className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={start}
      disabled={disabled}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-muted transition-colors disabled:opacity-50"
    >
      <Mic className="h-5 w-5" />
    </button>
  );
}
