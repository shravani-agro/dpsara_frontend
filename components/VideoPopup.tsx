"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/components/ui";

const POPUP_STORAGE_KEY = "dpsara_video_popup_closed";

export default function VideoPopup() {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    }

    checkMobile();

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleChange = () => checkMobile();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  useEffect(() => {
    let closed = false;
    try {
      closed = !!localStorage.getItem(POPUP_STORAGE_KEY);
    } catch {
      closed = false;
    }

    if (!closed) {
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    try {
      localStorage.setItem(POPUP_STORAGE_KEY, "1");
    } catch {
      // localStorage might not be available
    }
  };

  const videoSrc = isMobile ? "/9_16.mp4" : "/16_9.mp4";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="video-popup-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            key="video-popup-content"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 400, duration: 0.3 }}
            className={cn(
              "relative w-full rounded-2xl border border-white/10 bg-black shadow-2xl",
              isMobile
                ? "max-w-sm aspect-[9/16]"
                : "max-w-5xl aspect-video"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute -top-3 -right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-slate-300 transition-all hover:bg-white/20 hover:text-white"
              aria-label="Close popup"
            >
              <X className="h-4 w-4" />
            </button>

            <video
              className="h-full w-full rounded-xl object-cover"
              src={videoSrc}
              autoPlay
              muted
              playsInline
              onEnded={handleClose}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
