"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import TransactionRow from "@/components/TransactionRow";
import type { GiftPerson, Transaction } from "@/lib/types";

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [people, setPeople] = useState<GiftPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<
    "all" | "add" | "sub" | "transfer"
  >("all");
  const [personFilter, setPersonFilter] = useState("all");
  const [focusFilter, setFocusFilter] = useState<"all" | "person" | "split">(
    "all"
  );

  useEffect(() => {
    let active = true;

    async function load() {
      const [txRes, peopleRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("*, account:accounts(*), transfer_account:accounts!transactions_transfer_account_id_fkey(*), person:gift_people!transactions_person_id_fkey(*), split_expense:split_expenses(*)")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("gift_people").select("*").order("name", { ascending: true }),
      ]);

      if (!active) return;
      if (txRes.error) console.warn(txRes.error);
      if (peopleRes.error) console.warn(peopleRes.error);
      setTxs((txRes.data as Transaction[] | null) ?? []);
      setPeople((peopleRes.data as GiftPerson[] | null) ?? []);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const filteredTxs = useMemo(() => {
    const term = query.trim().toLowerCase();
    return txs.filter((tx) => {
      const matchesKind = kindFilter === "all" || tx.kind === kindFilter;
      const matchesPerson =
        personFilter === "all" || tx.person_id === personFilter;
      const matchesFocus =
        focusFilter === "all" ||
        (focusFilter === "person" ? Boolean(tx.person_id) : tx.category === "split");
      if (!matchesKind || !matchesPerson || !matchesFocus) return false;
      if (!term) return true;
      const fields = [
        tx.account?.kind ?? "",
        tx.account?.currency ?? "",
        tx.transfer_account?.kind ?? "",
        tx.transfer_account?.currency ?? "",
        tx.category ?? "",
        tx.note ?? "",
        tx.person?.name ?? "",
        tx.split_expense?.title ?? "",
        tx.amount.toString(),
      ]
        .join(" ")
        .toLowerCase();
      return fields.includes(term);
    });
  }, [focusFilter, kindFilter, personFilter, query, txs]);

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

        <div className="mt-3 flex flex-wrap gap-2">
          {(["all", "person", "split"] as const).map((focus) => (
            <button
              key={focus}
              onClick={() => setFocusFilter(focus)}
              className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.18em] border transition ${
                focusFilter === focus
                  ? "border-clay bg-clay/15 text-clay"
                  : "border-wheat/15 text-wheat/55"
              }`}
            >
              {focus === "all"
                ? "All activity"
                : focus === "person"
                ? "Person-linked"
                : "Shared expenses"}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setPersonFilter("all")}
            className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.18em] border transition ${
              personFilter === "all"
                ? "border-clay bg-clay/15 text-clay"
                : "border-wheat/15 text-wheat/55"
            }`}
          >
            All people
          </button>
          {people.map((person) => (
            <button
              key={person.id}
              onClick={() => setPersonFilter(person.id)}
              className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.18em] border transition ${
                personFilter === person.id
                  ? "border-clay bg-clay/15 text-clay"
                  : "border-wheat/15 text-wheat/55"
              }`}
            >
              {person.name}
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
