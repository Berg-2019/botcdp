import { useState, useRef } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  src: string;
  fromMe: boolean;
}

export function AudioPlayer({ src, fromMe }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play();
    }
    setPlaying(!playing);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => {
          const el = audioRef.current;
          if (el && el.duration) setProgress((el.currentTime / el.duration) * 100);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <button onClick={toggle} className={cn('shrink-0 h-8 w-8 rounded-full flex items-center justify-center', fromMe ? 'bg-primary-foreground/20' : 'bg-primary/10')}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      <div className="flex-1 space-y-1">
        <div className="h-1 rounded-full bg-current/20 overflow-hidden">
          <div className="h-full rounded-full bg-current transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] opacity-70">{playing ? formatTime((audioRef.current?.currentTime || 0)) : formatTime(duration)}</span>
      </div>
      <Mic className="h-3.5 w-3.5 opacity-50 shrink-0" />
    </div>
  );
}
