"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Delete } from "lucide-react";

const PIN_LENGTH = 6;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];
const LAST_ACTIVITY_KEY = "youcard_last_activity";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(value: string) {
    setSubmitting(true);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: value }),
    });
    setSubmitting(false);

    if (res.ok) {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      router.replace(params.get("next") || "/");
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 500);
    }
  }

  function press(key: string) {
    if (submitting) return;
    if (key === "back") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (key === "") return;
    if (pin.length >= PIN_LENGTH) return;

    const next = pin + key;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      submit(next);
    }
  }

  return (
    <main className="screen justify-center items-center">
      <h1 className="font-display text-2xl mb-2">YouCard</h1>
      <p className="text-wheat/50 text-sm mb-10">Enter your passcode</p>

      <motion.div
        animate={error ? { x: [0, -10, 10, -8, 8, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex gap-3 mb-12"
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border transition-colors ${
              i < pin.length
                ? "bg-clay border-clay"
                : "bg-transparent border-wheat/30"
            } ${error ? "border-bad" : ""}`}
          />
        ))}
      </motion.div>

      <div className="grid grid-cols-3 gap-x-8 gap-y-5">
        {KEYS.map((key, i) =>
          key === "" ? (
            <div key={i} />
          ) : key === "back" ? (
            <button
              key={i}
              onClick={() => press(key)}
              aria-label="Backspace"
              className="h-16 w-16 flex items-center justify-center text-wheat/60"
            >
              <Delete size={20} />
            </button>
          ) : (
            <button
              key={i}
              onClick={() => press(key)}
              className="h-16 w-16 rounded-full border border-wheat/15 flex items-center justify-center text-xl font-mono active:bg-wheat/10 transition"
            >
              {key}
            </button>
          )
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
