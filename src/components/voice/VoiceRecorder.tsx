"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, Globe, Sparkles } from "lucide-react";

interface VoiceRecorderProps {
  languageCode?: string;
  onTranscriptComplete?: (text: string, translation: string, language: string) => void;
  isSimulatedRecording?: boolean;
  simulatedTranscript?: { text: string; translation: string; language: string };
  onClose?: () => void;
}

const WELCOME_MESSAGES: Record<string, string> = {
  te: "మీ పంట గురించి అడగंडी...",
  hi: "अपनी फसल के बारे में पूछें...",
  kn: "ನಿಮ್ಮ ಬೆಳೆಯ ಬಗ್ಗೆ ಕೇಳಿ...",
  ta: "உங்கள் பயிர் பற்றி கேளுங்கள்...",
  mr: "तुमच्या पिकाबद्दल विचारा...",
  en: "Ask about your crop...",
};

const translateText = async (text: string, sourceLangCode: string): Promise<string> => {
  if (sourceLangCode === "en") return text;
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLangCode}&tl=en&dt=t&q=${encodeURIComponent(text)}`);
    if (res.ok) {
      const data = await res.json();
      return data[0][0][0] || text;
    }
  } catch (e) {
    console.error("Translation error:", e);
  }
  return text;
};

export default function VoiceRecorder({
  languageCode = "en",
  onTranscriptComplete,
  isSimulatedRecording = false,
  simulatedTranscript,
  onClose,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [status, setStatus] = useState<"idle" | "listening" | "transcribing" | "translating" | "done">("idle");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [transcriptText, setTranscriptText] = useState("");

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

  const handleUploadAndTranscribe = async (blob: Blob) => {
    setStatus("transcribing");
    try {
      const formData = new FormData();
      formData.append("file", blob, "input.webm");
      formData.append("language", "auto"); // Always auto-detect language in the background

      const res = await fetch("/api/chat/transcribe", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const transcribedText = data.text || "";
        setTranscriptText(transcribedText);
        
        setStatus("translating");
        
        // Extract the detected language code or fall back to the selected language code
        const detectedLangCode = data.language || "en";
        
        // Translate the native transcription to English
        const translation = await translateText(transcribedText, detectedLangCode);
        
        setStatus("done");
        setTimeout(() => {
          if (onTranscriptComplete) {
            onTranscriptComplete(transcribedText, translation, detectedLangCode);
          }
        }, 600);
      } else {
        throw new Error("Groq API transcription failed");
      }
    } catch (err) {
      console.error("Transcription error:", err);
      setStatus("idle");
      alert("Failed to transcribe speech. Please try speaking again.");
    }
  };

  const startRecording = async () => {
    setTranscriptText("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        await handleUploadAndTranscribe(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus("listening");
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Failed to access microphone:", err);
      alert("Microphone access is required for voice recording. Please check your browser settings.");
      setStatus("idle");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
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

  const welcomeText = WELCOME_MESSAGES[languageCode] || WELCOME_MESSAGES.en;

  return (
    <div className="w-full max-w-md mx-auto p-6 rounded-[32px] glass-card border border-white/50 flex flex-col items-center relative overflow-visible shadow-2xl">
      {/* Background glass glows */}
      <div className="absolute inset-0 rounded-[32px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-forest-light/5 via-ai-purple/5 to-google-blue/10 opacity-30" />
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-google-blue/10 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-ai-purple/10 blur-3xl" />
      </div>

      {/* Header Indicator */}
      <div className="relative w-full mb-8 z-10 flex justify-between items-center">
        <span className="text-[10px] font-bold text-forest-medium/55 flex items-center gap-1.5 uppercase tracking-widest font-sans">
          <Globe className="w-3.5 h-3.5 text-forest-medium/70" /> Language: Auto Detect
        </span>
        <span className="px-2.5 py-1 rounded-full bg-forest-medium/10 text-forest-medium font-bold text-[9px] uppercase tracking-wider">
          Background Sync
        </span>
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
                "{welcomeText}"
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
              <p className="text-[10px] text-forest-medium/50 mt-1.5 font-mono">00:{recordingDuration < 10 ? `0${recordingDuration}` : recordingDuration} / 00:30</p>
              {transcriptText && (
                <p className="text-xs text-forest-dark font-bold mt-2.5 px-3 py-1.5 rounded-xl bg-white/70 border border-forest-medium/10 max-w-[280px] line-clamp-2">
                  "{transcriptText}"
                </p>
              )}
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
