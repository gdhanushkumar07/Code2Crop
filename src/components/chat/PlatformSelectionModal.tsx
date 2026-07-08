"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, MessageCircle, X, Sparkles } from "lucide-react";

interface PlatformSelectionModalProps {
  isOpen: boolean;
  onSelectWebsite: () => void;
  onSelectWhatsApp: () => void;
  onClose: () => void;
}

export default function PlatformSelectionModal({
  isOpen,
  onSelectWebsite,
  onSelectWhatsApp,
  onClose,
}: PlatformSelectionModalProps) {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "14155238886";
  const prefilledMessage = encodeURIComponent(
    "Hi, I'd like to chat with the Code2Crop AI Agronomist 🌱"
  );

  const handleWhatsApp = () => {
    onSelectWhatsApp();
    window.open(
      `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-lg rounded-[32px] glass-card border border-white/50 shadow-2xl overflow-hidden"
          >
            {/* Background decorations */}
            <div className="absolute top-[-60px] right-[-60px] w-48 h-48 rounded-full bg-forest-light/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-60px] left-[-60px] w-48 h-48 rounded-full bg-ai-purple/10 blur-3xl pointer-events-none" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/50 hover:bg-white/80 text-forest-medium/60 hover:text-forest-dark transition-all z-30"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-10 p-8 space-y-8">
              {/* Header */}
              <div className="text-center space-y-3">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-forest-medium to-forest-light text-white flex items-center justify-center mx-auto shadow-lg"
                >
                  <Sparkles className="w-7 h-7" />
                </motion.div>
                <h2 className="text-xl font-black text-forest-dark">
                  Where would you like to chat?
                </h2>
                <p className="text-xs text-forest-medium/60 font-semibold max-w-sm mx-auto leading-relaxed">
                  Our AI Agronomist is available on both platforms. Your
                  conversation history stays synced across both.
                </p>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-4">
                {/* Website Option */}
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onSelectWebsite}
                  className="p-6 rounded-[24px] bg-white border-2 border-forest-medium/10 hover:border-forest-light/40 shadow-sm hover:shadow-lg transition-all flex flex-col items-center gap-4 text-center group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-forest-light/5 group-hover:bg-forest-light/10 flex items-center justify-center transition-colors">
                    <Monitor className="w-7 h-7 text-forest-medium" />
                  </div>
                  <div>
                    <span className="text-sm font-extrabold text-forest-dark block">
                      Chat on Website
                    </span>
                    <span className="text-[10px] text-forest-medium/50 font-semibold block mt-1">
                      Continue right here
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-forest-medium/40 uppercase tracking-widest bg-forest-light/5 px-3 py-1 rounded-full">
                    Recommended
                  </span>
                </motion.button>

                {/* WhatsApp Option */}
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleWhatsApp}
                  className="p-6 rounded-[24px] bg-white border-2 border-forest-medium/10 hover:border-[#25D366]/40 shadow-sm hover:shadow-lg transition-all flex flex-col items-center gap-4 text-center group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#25D366]/5 group-hover:bg-[#25D366]/10 flex items-center justify-center transition-colors">
                    <MessageCircle className="w-7 h-7 text-[#25D366]" />
                  </div>
                  <div>
                    <span className="text-sm font-extrabold text-forest-dark block">
                      Chat on WhatsApp
                    </span>
                    <span className="text-[10px] text-forest-medium/50 font-semibold block mt-1">
                      Opens in new tab
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-[#25D366]/60 uppercase tracking-widest bg-[#25D366]/5 px-3 py-1 rounded-full">
                    Mobile Friendly
                  </span>
                </motion.button>
              </div>

              {/* Footer note */}
              <p className="text-center text-[10px] text-forest-medium/40 font-semibold leading-relaxed">
                🔄 Your chat history syncs automatically between both platforms
                via Firebase
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
