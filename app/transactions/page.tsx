"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import TransactionRow from "@/components/TransactionRow";
import type { Transaction } from "@/lib/types";

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<
    "all" | "add" | "sub" | "transfer"
  >("all");

  useEffect(() => {
    let active = true;
    supabase
      .from("transactions")
      .select("*, account:accounts(*), transfer_account:accounts!transactions_transfer_account_id_fkey(*)")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(
        ({
          data,
          error,
        }: {
          data: Transaction[] | null;
          error: unknown;
        }) => {
          if (!active) return;
          if (error) console.warn(error);
          setTxs((data as Transaction[]) ?? []);
          setLoading(false);
        }
      );
    return () => {
      active = false;
    };
  }, []);

  const filteredTxs = useMemo(() => {
    const term = query.trim().toLowerCase();
    return txs.filter((tx) => {
      const matchesKind = kindFilter === "all" || tx.kind === kindFilter;
      if (!matchesKind) return false;
      if (!term) return true;
      const fields = [
        tx.account?.kind ?? "",
        tx.account?.currency ?? "",
        tx.transfer_account?.kind ?? "",
        tx.transfer_account?.currency ?? "",
        tx.category ?? "",
        tx.note ?? "",
        tx.amount.toString(),
      ]
        .join(" ")
        .toLowerCase();
      return fields.includes(term);
    });
  }, [kindFilter, query, txs]);

  return (
    <main className="screen">
      <header className="pt-6 pb-2">
        <h1 className="font-display text-2xl">Recent transactions</h1>
        <p className="text-wheat/45 text-sm mt-1">
          Search by note, category, amount, or wallet.
        </p>
      </header>

      <div className="flex-1 mt-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transactions"
          className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {(["all", "add", "sub", "transfer"] as const).map((kind) => (
            <button
              key={kind}
              onClick={() => setKindFilter(kind)}
              className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.18em] border transition ${
                kindFilter === kind
                  ? "border-clay bg-clay/15 text-clay"
                  : "border-wheat/15 text-wheat/55"
              }`}
            >
              {kind}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-wheat/40 text-sm py-8 text-center">Loading…</p>
        ) : filteredTxs.length === 0 ? (
          <p className="text-wheat/40 text-sm py-8 text-center">
            {txs.length === 0
              ? "Nothing logged yet. Add or subtract from the home screen to start your ledger."
              : "No matching transactions."}
          </p>
        ) : (
          filteredTxs.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
        )}
      </div>

      <BottomNav />
    </main>
  );
}
