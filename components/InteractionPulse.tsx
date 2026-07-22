"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const INTERACTIVE_SELECTOR =
  "button, a, input[type='button'], input[type='submit'], summary, [role='button'], [data-interactive='true']";

export default function InteractionPulse() {
  const [pulseId, setPulseId] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    function pulse(target: EventTarget | null) {
      if (!(target instanceof Element)) return;
      if (!target.closest(INTERACTIVE_SELECTOR)) return;

      setPulseId((current) => current + 1);
      setVisible(true);
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        setVisible(false);
      }, 650);
    }

    function onPointerDown(event: PointerEvent) {
      pulse(event.target);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" && event.key !== " ") return;
      pulse(event.target);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={pulseId}
          className="pointer-events-none fixed left-0 right-0 top-0 z-[60] h-1 overflow-hidden"
          initial={{ opacity: 0, scaleX: 0.4 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <div className="h-full w-full bg-gradient-to-r from-transparent via-clay to-transparent shadow-[0_0_18px_rgba(200,98,45,0.65)]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
