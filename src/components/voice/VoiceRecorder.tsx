"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, Globe, Sparkles, Check, ChevronDown } from "lucide-react";

interface VoiceRecorderProps {
  onTranscriptComplete?: (text: string, translation: string, language: string) => void;
  isSimulatedRecording?: boolean;
  simulatedTranscript?: { text: string; translation: string; language: string };
  onClose?: () => void;
}

const LANGUAGES = [
  { code: "te", name: "Telugu (తెలుగు)", welcome: "మీ పంట గురించి అడగండి..." },
  { code: "hi", name: "Hindi (हिन्दी)", welcome: "अपनी फसल के बारे में पूछें..." },
  { code: "kn", name: "Kannada (ಕನ್ನಡ)", welcome: "ನಿಮ್ಮ ಬೆಳೆಯ గురించి కేలి..." },
  { code: "ta", name: "Tamil (தமிழ்)", welcome: "உங்கள் பயிர் பற்றி கேளுங்கள்..." },
  { code: "mr", name: "Marathi (मराठी)", welcome: "तुमच्या పికాबद्दल విచారా..." },
  { code: "en", name: "English (English)", welcome: "Ask about your crop..." },
];

export default function VoiceRecorder({
  onTranscriptComplete,
  isSimulatedRecording = false,
  simulatedTranscript,
  onClose,
}: VoiceRecorderProps) {
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [status, setStatus] = useState<"idle" | "listening" | "transcribing" | "translating" | "done">("idle");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio wave bars simulation
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(19).fill(6));

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setWaveHeights(
          Array(19)
            .fill(0)
            .map(() => Math.floor(Math.random() * 55) + 8)
        );
      }, 90);
      return () => clearInterval(interval);
    } else {
      setWaveHeights(Array(19).fill(6));
    }
  }, [isRecording]);

  const startRecording = () => {
    setIsRecording(true);
    setStatus("listening");
    setRecordingDuration(0);
    timerRef.current = setInterval(() => {
      setRecordingDuration((prev) => {
        if (prev >= 4) {
          stopRecording();
          return 4;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setStatus("transcribing");

    setTimeout(() => {
      setStatus("translating");
      setTimeout(() => {
        setStatus("done");
        if (onTranscriptComplete) {
          if (simulatedTranscript) {
            onTranscriptComplete(
              simulatedTranscript.text,
              simulatedTranscript.translation,
              simulatedTranscript.language
            );
          } else {
            onTranscriptComplete(
              "నెక్స్ట్ సీజన్ లో నేను ఏ పంట వేసుకోవాలి? నా పొలంలో తేమ తక్కువగా ఉంది.",
              "What crop should I plant next season? My soil moisture is low.",
              selectedLang.name
            );
          }
        }
      }, 1400);
    }, 1400);
  };

  useEffect(() => {
    if (isSimulatedRecording) {
      startRecording();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSimulatedRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 rounded-[32px] glass-card border border-white/50 flex flex-col items-center relative overflow-hidden shadow-2xl">
      {/* Background glass glows */}
      <div className="absolute inset-0 bg-gradient-to-tr from-forest-light/5 via-ai-purple/5 to-google-blue/10 opacity-30 pointer-events-none" />
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-google-blue/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-ai-purple/10 blur-3xl pointer-events-none" />

      {/* Language Selector */}
      <div className="relative w-full mb-8 z-10 flex justify-between items-center">
        <span className="text-[10px] font-bold text-forest-medium/55 flex items-center gap-1.5 uppercase tracking-widest font-sans">
          <Globe className="w-3.5 h-3.5 text-forest-medium/70" /> Input Language
        </span>
        
        <div className="relative">
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-forest-medium/10 text-xs font-bold text-forest-dark hover:bg-white hover:border-forest-medium/20 transition-all shadow-sm"
          >
            {selectedLang.name}
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          <AnimatePresence>
            {langDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-forest-medium/10 shadow-xl overflow-hidden z-20 p-1"
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setSelectedLang(lang);
                      setLangDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-forest-light/5 text-forest-dark flex justify-between items-center transition-all"
                  >
                    {lang.name}
                    {selectedLang.code === lang.code && (
                      <Check className="w-3.5 h-3.5 text-forest-medium" />
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Center Waveform & Mic */}
      <div className="relative h-48 w-full flex flex-col items-center justify-center mb-6">
        {/* Radially expanding ring glows on voice input */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [1, 1.35, 1],
                opacity: [0.35, 0.7, 0.35],
              }}
              transition={{
                repeat: Infinity,
                duration: 2.2,
                ease: "easeInOut",
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-google-blue via-ai-purple to-pink-500 filter blur-xl opacity-40"
            />
          )}
        </AnimatePresence>

        {/* Waves */}
        <div className="flex items-center gap-1 h-20 mb-6">
          {waveHeights.map((height, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full bg-gradient-to-t from-forest-medium via-google-blue to-ai-purple"
              style={{ height: `${height}px` }}
              animate={
                isRecording
                  ? {
                      height: [
                        `${height}px`,
                        `${Math.min(90, height * 1.4)}px`,
                        `${Math.max(6, height * 0.4)}px`,
                      ],
                    }
                  : { height: "6px" }
              }
              transition={{
                repeat: Infinity,
                duration: 0.9 + i * 0.04,
                repeatType: "reverse",
              }}
            />
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.06, boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}
          whileTap={{ scale: 0.94 }}
          onClick={toggleRecording}
          disabled={status === "transcribing" || status === "translating"}
          className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
            isRecording
              ? "bg-danger-red text-white"
              : "bg-gradient-to-tr from-forest-medium to-forest-light text-white"
          }`}
        >
          {isRecording ? (
            <MicOff className="w-7 h-7" />
          ) : (
            <Mic className="w-7 h-7" />
          )}
        </motion.button>
      </div>

      {/* Process Text Overlay */}
      <div className="w-full text-center min-h-[4.5rem] flex flex-col justify-center px-6">
        <AnimatePresence mode="wait">
          {status === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              <p className="text-xs font-bold text-forest-dark/85 leading-relaxed">
                "{selectedLang.welcome}"
              </p>
              <p className="text-[10px] text-forest-medium/40 mt-1 font-semibold uppercase tracking-wider">
                Tap microphone to begin
              </p>
            </motion.div>
          )}

          {status === "listening" && (
            <motion.div
              key="listening"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex flex-col items-center"
            >
              <div className="flex items-center gap-1.5 text-forest-medium font-extrabold text-xs uppercase tracking-wider">
                <span className="relative flex h-2.5 w-2.5 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-medium opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-forest-medium"></span>
                </span>
                Listening...
              </div>
              <p className="text-[10px] text-forest-medium/50 mt-1.5 font-mono">00:0{recordingDuration} / 00:04</p>
            </motion.div>
          )}

          {status === "transcribing" && (
            <motion.div
              key="transcribing"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex flex-col items-center"
            >
              <div className="flex items-center gap-1.5 text-google-blue font-extrabold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 animate-spin text-google-blue" />
                Speech-to-Text Transcription
              </div>
              <p className="text-[10px] text-forest-medium/40 mt-1">Google Cloud Telemetry</p>
            </motion.div>
          )}

          {status === "translating" && (
            <motion.div
              key="translating"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex flex-col items-center"
            >
              <div className="flex items-center gap-1.5 text-ai-purple font-extrabold text-xs uppercase tracking-wider">
                <Globe className="w-4 h-4 animate-bounce text-ai-purple" />
                Translating to English
              </div>
              <p className="text-[10px] text-forest-medium/40 mt-1">Translation API Engine</p>
            </motion.div>
          )}

          {status === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex flex-col items-center"
            >
              <div className="flex items-center gap-1.5 text-natural-green font-extrabold text-xs uppercase tracking-wider">
                <Volume2 className="w-4 h-4" />
                Audio Loop Processed
              </div>
              <p className="text-[10px] text-forest-medium/45 mt-1">Grounded recommendations loading...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
