"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { formatAmount } from "@/lib/currency";
import type { Account } from "@/lib/types";

export default function BalanceCircle({
  accounts,
  onAdd,
  onSub,
}: {
  // All accounts of this kind (card or cash), primary account first.
  // The circle pages through each one's own stored balance -- this is
  // "what you actually hold in each currency," not a converted estimate.
  accounts: Account[];
  onAdd: (accountId: string) => void;
  onSub: (accountId: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const active = accounts[index];

  useEffect(() => {
    if (index >= accounts.length) {
      setIndex(0);
    }
  }, [accounts.length, index]);

  function goTo(nextIndex: number) {
    if (nextIndex === index || accounts.length === 0) return;
    setDirection(nextIndex > index ? 1 : -1);
    setIndex(nextIndex);
  }

  function cycle() {
    const nextIndex = (index + 1) % accounts.length;
    setDirection(1);
    setIndex(nextIndex);
  }

  if (!active) return null;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 48 : -48,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -48 : 48,
      opacity: 0,
    }),
  } as const;

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="flex items-center justify-center gap-5">
        <button
          onClick={() => onSub(active.id)}
          aria-label="Subtract"
          className="h-11 w-11 shrink-0 rounded-full border border-wheat/30 flex items-center justify-center text-wheat/80 active:scale-95 transition"
        >
          <Minus size={18} />
        </button>

        <motion.button
          onClick={cycle}
          aria-label={
            accounts.length > 1
              ? "Tap to see your balance in another currency you hold"
              : undefined
          }
          className="relative h-56 w-56 shrink-0 rounded-full bg-moss/40 border border-wheat/15 flex flex-col items-center justify-center overflow-hidden active:scale-[0.98] transition"
        >
          <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            <motion.div
              key={active.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center"
            >
              <span className="font-mono text-3xl tabular-nums">
                {formatAmount(active.balance)}
              </span>
              <span className="mt-1 text-sm tracking-[0.2em] text-wheat/60">
                {active.currency}
              </span>
            </motion.div>
          </AnimatePresence>
        </motion.button>

        <button
          onClick={() => onAdd(active.id)}
          aria-label="Add"
          className="h-11 w-11 shrink-0 rounded-full bg-clay flex items-center justify-center text-ink active:scale-95 transition"
        >
          <Plus size={18} />
        </button>
      </div>

      {accounts.length > 1 && (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={cycle}
            className="inline-flex items-center gap-3 rounded-full border border-wheat/12 bg-ink/18 px-3 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
            aria-label={`Cycle currencies. Current ${active.currency}.`}
          >
            <span className="text-[10px] uppercase tracking-[0.28em] text-wheat/45">
              Tap to cycle
            </span>
            <span className="flex items-center gap-1" aria-hidden>
              {accounts.map((account, accountIndex) => {
                const isActive = accountIndex === index;
                return (
                  <span
                    key={account.id}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isActive ? "w-7 bg-clay" : "w-1.5 bg-wheat/25"
                    }`}
                  />
                );
              })}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
