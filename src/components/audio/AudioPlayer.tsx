import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, Download, RefreshCw } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  duration?: number;
  className?: string;
  autoPlay?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  duration: initialDuration,
  className = "",
  autoPlay = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
        setIsLoaded(true);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(err => {
        console.warn("Audio play error:", err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1.0, 1.25, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Visual pseudo-waveform bars
  const barsCount = 20;

  return (
    <div className={`flex flex-col gap-1.5 p-2 rounded-xl bg-surface-200/60 dark:bg-surface-800/60 border border-surface-300/80 dark:border-surface-700/60 shadow-xs max-w-full ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" autoPlay={autoPlay} />
      
      <div className="flex items-center gap-2.5">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-accent text-background flex items-center justify-center shrink-0 shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title={isPlaying ? "Pause voice note" : "Play voice note"}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
          )}
        </button>

        {/* Waveform Progress Area */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <div className="relative flex items-center h-5 w-full cursor-pointer group">
            {/* Waveform Bars Background */}
            <div className="absolute inset-0 flex items-center justify-between gap-0.5 pointer-events-none px-0.5">
              {Array.from({ length: barsCount }).map((_, i) => {
                const barHeight = 20 + Math.sin(i * 0.8) * 40 + (i % 3) * 15;
                const isPassed = (i / barsCount) * 100 <= progressPercent;
                return (
                  <div
                    key={i}
                    style={{ height: `${Math.max(25, Math.min(90, barHeight))}%` }}
                    className={`w-0.5 rounded-full transition-colors ${
                      isPassed
                        ? "bg-accent"
                        : "bg-surface-300 dark:bg-surface-600 group-hover:bg-surface-400"
                    }`}
                  />
                );
              })}
            </div>

            {/* Invisible Range Slider for scrubbing */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full opacity-0 z-10 cursor-pointer h-full"
            />
          </div>

          <div className="flex justify-between items-center text-[9px] font-bold text-surface-500 dark:text-surface-400 tabular-nums px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls: Speed + Download */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={cyclePlaybackRate}
            className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:text-accent border border-surface-300 dark:border-surface-600 transition-colors"
            title="Change playback speed"
          >
            {playbackRate}x
          </button>

          <a
            href={src}
            download={`voice-note-${Date.now()}.webm`}
            className="p-1 rounded text-surface-400 hover:text-foreground transition-colors"
            title="Download voice note"
          >
            <Download className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
