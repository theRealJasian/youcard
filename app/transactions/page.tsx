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
          .select("*, account:accounts!transactions_account_id_fkey(*), transfer_account:accounts!transactions_transfer_account_id_fkey(*), person:gift_people!transactions_person_id_fkey(*)")
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

        <div className="mt-3 grid gap-3 rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
          <label className="grid gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
              Transaction type
            </span>
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
              className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
            >
              <option value="all">All transactions</option>
              <option value="add">Add</option>
              <option value="sub">Subtract</option>
              <option value="transfer">Transfer</option>
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
              Activity focus
            </span>
            <select
              value={focusFilter}
              onChange={(e) => setFocusFilter(e.target.value as typeof focusFilter)}
              className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
            >
              <option value="all">All activity</option>
              <option value="person">Person-linked</option>
              <option value="split">Shared expenses</option>
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
              Person
            </span>
            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
            >
              <option value="all">All people</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
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
