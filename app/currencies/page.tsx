"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, GripVertical, Star } from "lucide-react";
import { Reorder } from "framer-motion";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import type { Account, AccountKind } from "@/lib/types";

const COMMON_CURRENCIES = ["USD", "THB", "EUR", "GBP", "JPY"];

function CurrenciesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const kind = (params.get("kind") as AccountKind) ?? "cash";
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [adding, setAdding] = useState(false);
  const [newCurrency, setNewCurrency] = useState("");

  async function load() {
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .eq("kind", kind)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    const nextAccounts = [...(data ?? [])].sort(
      (a, b) =>
        a.sort_order - b.sort_order || Number(b.is_primary) - Number(a.is_primary)
    );
    setAccounts(nextAccounts);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  async function persistOrder(nextAccounts: Account[]) {
    const optimisticAccounts = nextAccounts.map((account, index) => ({
      ...account,
      sort_order: index,
      is_primary: index === 0,
    }));
    setAccounts(optimisticAccounts);
    const { error } = await supabase.rpc("reorder_accounts", {
      p_kind: kind,
      p_account_ids: optimisticAccounts.map((account) => account.id),
    });
    if (error) {
      console.error(error);
      load();
    }
  }

  async function handleReorder(nextAccounts: Account[]) {
    await persistOrder(nextAccounts);
  }

  async function setPrimary(accountId: string) {
    const target = accounts.find((account) => account.id === accountId);
    if (!target) return;
    const reordered = [
      target,
      ...accounts.filter((account) => account.id !== accountId),
    ];
    await persistOrder(reordered);
  }

  async function createCurrency(code: string) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    const isFirst = accounts.length === 0;
    const nextSortOrder =
      accounts.reduce((max, account) => Math.max(max, account.sort_order), -1) + 1;
    const { error } = await supabase.from("accounts").insert({
      kind,
      currency: trimmed,
      balance: 0,
      is_primary: isFirst,
      sort_order: nextSortOrder,
    });
    if (error) {
      console.error(error);
      return;
    }
    setNewCurrency("");
    setAdding(false);
    load();
  }

  return (
    <main className="screen">
      <header className="pt-6 pb-2">
        <h1 className="font-display text-2xl capitalize">{kind} currencies</h1>
        <p className="text-wheat/45 text-xs mt-1">
          Drag a currency to the top to make it show first on Home.
        </p>
      </header>

      <div className="flex-1 mt-2">
        <Reorder.Group
          axis="y"
          values={accounts}
          onReorder={handleReorder}
          className="flex flex-col"
        >
          {accounts.map((a) => (
            <Reorder.Item
              key={a.id}
              value={a}
              className="w-full flex items-center justify-between py-3 border-b border-wheat/10 text-left cursor-grab active:cursor-grabbing"
              whileDrag={{
                scale: 1.02,
                boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
              }}
            >
              <div className="flex items-center gap-3">
                <GripVertical size={16} className="text-wheat/35 shrink-0" />
                <span className={a.is_primary ? "text-clay" : "text-wheat/80"}>
                  {a.currency}
                </span>
                {a.is_primary && (
                  <span className="text-[10px] uppercase tracking-[0.25em] text-clay/80">
                    Primary
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-wheat/50">
                  {a.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                {!a.is_primary && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setPrimary(a.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-wheat/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-wheat/55 transition hover:border-clay/50 hover:text-clay"
                    aria-label={`Set ${a.currency} as primary`}
                  >
                    <Star size={11} />
                    Primary
                  </button>
                )}
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {adding ? (
          <div className="flex items-center gap-2 py-3">
            <input
              autoFocus
              placeholder="e.g. THB"
              value={newCurrency}
              onChange={(e) => setNewCurrency(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createCurrency(newCurrency)}
              className="flex-1 bg-transparent border-b border-wheat/30 py-1 uppercase outline-none focus:border-clay"
              maxLength={3}
            />
            <button
              onClick={() => createCurrency(newCurrency)}
              className="text-clay text-sm"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-2 py-3 text-wheat/50"
          >
            <Plus size={16} /> Add currency
          </button>
        )}

        {adding && (
          <div className="flex flex-wrap gap-2 mt-2">
            {COMMON_CURRENCIES.filter(
              (c) => !accounts.some((a) => a.currency === c)
            ).map((c) => (
              <button
                key={c}
                onClick={() => createCurrency(c)}
                className="text-xs border border-wheat/20 rounded-full px-3 py-1.5 text-wheat/60"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => router.push("/")}
        className="text-center text-sm text-wheat/50 pb-2"
      >
        Done
      </button>

      <BottomNav />
    </main>
  );
}

export default function CurrenciesPage() {
  return (
    <Suspense fallback={null}>
      <CurrenciesInner />
    </Suspense>
  );
}
