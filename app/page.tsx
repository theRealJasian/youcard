"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import BalanceCircle from "@/components/BalanceCircle";
import BottomNav from "@/components/BottomNav";
import type { Account, AccountKind } from "@/lib/types";

const DEFAULT_KINDS: AccountKind[] = ["card", "cash"];

function BlankBalance({
  kind,
  onSetup,
}: {
  kind: AccountKind;
  onSetup: () => void;
}) {
  const currency = kind === "card" ? "USD" : "THB";

  return (
    <div className="flex items-center justify-center gap-5 py-8">
      <div className="h-11 w-11 shrink-0" aria-hidden />

      <button
        onClick={onSetup}
        className="relative h-56 w-56 shrink-0 rounded-full bg-moss/30 border border-wheat/15 flex flex-col items-center justify-center overflow-hidden active:scale-[0.98] transition"
      >
        <span className="font-mono text-3xl tabular-nums">0.00</span>
        <span className="mt-1 text-sm tracking-[0.2em] text-wheat/60">
          {currency}
        </span>
        <span className="mt-4 text-[11px] tracking-[0.3em] uppercase text-wheat/40">
          Blank ledger
        </span>
        <span className="mt-2 text-xs text-wheat/45 px-6 text-center">
          Tap to set up this account type
        </span>
      </button>

      <div className="h-11 w-11 shrink-0" aria-hidden />
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedKind, setSelectedKind] = useState<AccountKind>("card");
  const [kindDirection, setKindDirection] = useState(1);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!isSupabaseConfigured) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) console.error(error);
    setAccounts((data as Account[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const accountKinds = Array.from(
    new Set(accounts.map((account) => account.kind))
  );
  const availableKinds =
    accountKinds.length > 0
      ? [
          ...DEFAULT_KINDS.filter((kind) => accountKinds.includes(kind)),
          ...accountKinds.filter((kind) => !DEFAULT_KINDS.includes(kind)),
        ]
      : DEFAULT_KINDS;
  const availableKindsKey = availableKinds.join("|");
  const kind = availableKinds.includes(selectedKind)
    ? selectedKind
    : availableKinds[0];

  useEffect(() => {
    if (!availableKinds.includes(selectedKind)) {
      setSelectedKind(availableKinds[0]);
    }
  }, [availableKindsKey, selectedKind]);

  const kindAccounts = [...accounts]
    .filter((a) => a.kind === kind)
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order ||
        Number(b.is_primary) - Number(a.is_primary)
    );
  const hasAccounts = kindAccounts.length > 0;

  function switchKind(nextKind: AccountKind) {
    const currentIndex = availableKinds.indexOf(kind);
    const nextIndex = availableKinds.indexOf(nextKind);
    if (nextIndex === -1 || nextKind === kind) return;
    setKindDirection(nextIndex > currentIndex ? 1 : -1);
    setSelectedKind(nextKind);
  }

  const kindSlideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
    }),
  } as const;

  return (
    <main className="screen">
      <header className="pt-6 pb-2">
        <h1 className="font-display text-2xl">YouCard</h1>
        <p className="text-wheat/50 text-sm mt-1">
          Track every wallet without the banking clutter.
        </p>
      </header>

      <motion.div
        className="flex-1 flex flex-col justify-center touch-pan-y"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          const threshold = 60;
          const currentIndex = availableKinds.indexOf(kind);
          if (
            info.offset.x < -threshold &&
            currentIndex < availableKinds.length - 1
          ) {
            setKindDirection(1);
            setSelectedKind(availableKinds[currentIndex + 1]);
          } else if (info.offset.x > threshold && currentIndex > 0) {
            setKindDirection(-1);
            setSelectedKind(availableKinds[currentIndex - 1]);
          }
        }}
      >
        <AnimatePresence mode="wait" initial={false} custom={kindDirection}>
          <motion.div
            key={kind}
            custom={kindDirection}
            variants={kindSlideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col"
          >
            <p className="text-center uppercase tracking-[0.3em] text-xs text-wheat/40">
              {kind}
            </p>

            {loading ? (
              <div className="h-56 w-56 mx-auto rounded-full bg-wheat/5 animate-pulse mt-6" />
            ) : hasAccounts ? (
              <BalanceCircle
                accounts={kindAccounts}
                onAdd={(accountId) => router.push(`/add?account=${accountId}`)}
                onSub={(accountId) => router.push(`/sub?account=${accountId}`)}
              />
            ) : (
              <div className="text-center">
                <BlankBalance
                  kind={kind}
                  onSetup={() => router.push(`/currencies?kind=${kind}`)}
                />
                <p className="text-wheat/60 mb-4">
                  {isSupabaseConfigured
                    ? `No ${kind} account yet.`
                    : "Supabase is not configured, so this is a blank demo shell."}
                </p>
                <Link
                  href={`/currencies?kind=${kind}`}
                  className="text-clay underline underline-offset-4"
                >
                  Set up {kind}
                </Link>
              </div>
            )}

            <Link
              href="/transactions"
              className="flex items-center justify-center gap-1 text-sm text-wheat/60 mt-4"
            >
              Recent transactions <ChevronRight size={16} />
            </Link>
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 mx-auto inline-flex items-center gap-2 rounded-full border border-wheat/10 bg-wheat/5 px-3 py-2">
          {availableKinds.map((k) => {
            const active = k === kind;
            return (
              <button
                key={k}
                onClick={() => switchKind(k)}
                className={`h-2.5 rounded-full transition ${
                  active ? "w-8 bg-clay" : "w-2.5 bg-wheat/25"
                }`}
                aria-label={`Show ${k}`}
                title={k}
              >
                <span className="sr-only">{k}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      <BottomNav />
    </main>
  );
}
