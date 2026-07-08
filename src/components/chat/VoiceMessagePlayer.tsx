"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

interface VoiceMessagePlayerProps {
  text: string;
  languageCode: string;
}

export default function VoiceMessagePlayer({ text, languageCode }: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Set initial duration estimate based on character count (~12 characters per second)
  const [duration, setDuration] = useState(() => Math.max(3, Math.round(text.length / 12)));

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Unicode helper to detect if the text contains regional characters
  const detectLanguage = (str: string, currentLang: string): string => {
    if (/[\u0C00-\u0C7F]/.test(str)) return "te"; // Telugu
    if (/[\u0900-\u097F]/.test(str)) {
      return currentLang === "mr" ? "mr" : "hi"; // Hindi or Marathi Devanagari
    }
    if (/[\u0C80-\u0CFF]/.test(str)) return "kn"; // Kannada
    if (/[\u0B80-\u0BFF]/.test(str)) return "ta"; // Tamil
    return "en"; // Fallback to English
  };

  // Prefetch and initialize audio on mount or text/lang changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const detectedLang = detectLanguage(text, languageCode);
    const url = `/api/chat/speech?text=${encodeURIComponent(text)}&lang=${detectedLang}`;
    
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.playbackRate = playbackRate;

    audio.onplay = () => {
      setIsPlaying(true);
    };

    audio.onpause = () => {
      setIsPlaying(false);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && isFinite(audio.duration) && !isNaN(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onloadedmetadata = () => {
      if (audio.duration && isFinite(audio.duration) && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setProgress(100);
      setCurrentTime(0);
    };

    audio.onerror = (e) => {
      console.warn("Edge neural voice audio prefetch/playback error:", e);
      setIsPlaying(false);
    };

    // Pre-load the audio in the background for zero-lag play
    audio.load();

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [text, languageCode]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.warn("Playback start failed:", err);
        setIsPlaying(false);
      });
    }
  };

  const toggleRate = () => {
    const nextRates: Record<number, 1 | 1.5 | 2> = { 1: 1.5, 1.5: 2, 2: 1 };
    const nextRate = nextRates[playbackRate];
    setPlaybackRate(nextRate);

    // Dynamically apply playback speed natively
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const waveBars = [15, 8, 22, 12, 5, 18, 25, 10, 14, 20, 7, 16, 24, 11, 9, 17, 13, 21, 6, 12];

  return (
    <div className="flex items-center gap-3 bg-forest-light/10 border border-forest-medium/10 p-3 rounded-2xl w-full max-w-[280px] select-none mt-2">
      <button
        onClick={handlePlayPause}
        className="w-9 h-9 rounded-full bg-forest-medium text-white flex items-center justify-center hover:scale-105 transition-all shrink-0 shadow-sm"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-white" />
        ) : (
          <Play className="w-4 h-4 fill-white translate-x-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-end gap-[2px] h-6 px-1">
          {waveBars.map((h, i) => {
            const barProgress = (i / waveBars.length) * 100;
            const isActive = progress >= barProgress;
            return (
              <div
                key={i}
                className="w-[3px] rounded-full transition-all duration-150"
                style={{
                  height: `${h}px`,
                  backgroundColor: isActive ? "#1C3F24" : "#D1D5DB",
                }}
              />
            );
          })}
        </div>

        <div className="flex justify-between text-[9px] font-bold text-forest-medium/60 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1 items-center shrink-0">
        <button
          onClick={toggleRate}
          className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-forest-medium/10 text-forest-medium hover:bg-forest-medium/20 transition-all"
        >
          {playbackRate}x
        </button>
        <Volume2 className="w-3.5 h-3.5 text-forest-medium/65" />
      </div>
    </div>
  );
}
