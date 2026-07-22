"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import TransactionRow from "@/components/TransactionRow";
import type {
  Account,
  Budget,
  Goal,
  GiftPerson,
  RecurringRule,
  Transaction,
} from "@/lib/types";

export default function InsightsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [people, setPeople] = useState<GiftPerson[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const [accountsRes, txRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("*")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("transactions")
          .select("*, account:accounts!transactions_account_id_fkey(*), transfer_account:accounts!transactions_transfer_account_id_fkey(*), person:gift_people!transactions_person_id_fkey(*)")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const [peopleRes, budgetsRes, goalsRes, rulesRes] = await Promise.all([
        supabase.from("gift_people").select("*").order("name", { ascending: true }),
        supabase.from("budgets").select("*").order("created_at", { ascending: false }),
        supabase.from("goals").select("*").order("created_at", { ascending: false }),
        supabase.from("recurring_rules").select("*").order("created_at", { ascending: false }),
      ]);

      if (!active) return;
      if (accountsRes.error) console.warn(accountsRes.error);
      if (txRes.error) console.warn(txRes.error);
      if (peopleRes.error) console.warn(peopleRes.error);
      if (budgetsRes.error) console.warn(budgetsRes.error);
      if (goalsRes.error) console.warn(goalsRes.error);
      if (rulesRes.error) console.warn(rulesRes.error);

      setAccounts((accountsRes.data as Account[] | null) ?? []);
      setTransactions((txRes.data as Transaction[] | null) ?? []);
      setPeople((peopleRes.data as GiftPerson[] | null) ?? []);
      setBudgets((budgetsRes.data as Budget[] | null) ?? []);
      setGoals((goalsRes.data as Goal[] | null) ?? []);
      setRules((rulesRes.data as RecurringRule[] | null) ?? []);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const addCount = transactions.filter((tx) => tx.kind === "add").length;
    const subCount = transactions.filter((tx) => tx.kind === "sub").length;
    const currencyCount = new Set(
      accounts.map((account) => account.currency)
    ).size;
    const walletTypes = new Set(accounts.map((account) => account.kind)).size;
    const totalBudget = budgets.length;
    const totalGoal = goals.length;
    const totalRules = rules.length;
    return { addCount, subCount, currencyCount, walletTypes, totalBudget, totalGoal, totalRules };
  }, [accounts, budgets, goals, rules, transactions]);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.kind !== "sub" || !tx.category) continue;
      map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
    }
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [transactions]);

  const peopleTotals = useMemo(() => {
    const spent = new Map<string, number>();
    const received = new Map<string, number>();

    for (const tx of transactions) {
      if (!tx.person_id || !tx.person) continue;
      if (tx.kind === "sub" && tx.person_role === "for") {
        spent.set(tx.person_id, (spent.get(tx.person_id) ?? 0) + tx.amount);
      }
      if (tx.kind === "add" && tx.person_role === "from") {
        received.set(tx.person_id, (received.get(tx.person_id) ?? 0) + tx.amount);
      }
    }

    const mergePeople = (map: Map<string, number>) =>
      people
        .map((person) => ({
          person,
          amount: map.get(person.id) ?? 0,
        }))
        .filter((entry) => entry.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    return {
      spent: mergePeople(spent),
      received: mergePeople(received),
    };
  }, [people, transactions]);

  const primaryByKind = useMemo(() => {
    const map = new Map<string, Account>();
    for (const account of accounts) {
      if (account.is_primary || !map.has(account.kind)) {
        map.set(account.kind, account);
      }
    }
    return Array.from(map.values());
  }, [accounts]);

  return (
    <main className="screen">
      <header className="pt-6 pb-2">
        <h1 className="font-display text-2xl">Insights</h1>
        <p className="text-wheat/45 text-sm mt-1">
          A quick read on what your ledger is doing.
        </p>
      </header>

      <div className="flex-1 mt-2">
        {loading ? (
          <p className="text-wheat/40 text-sm py-8 text-center">Loading…</p>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/35">
                  Wallet types
                </p>
                <p className="mt-2 font-display text-2xl">
                  {stats.walletTypes}
                </p>
              </div>
              <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/35">
                  Currencies
                </p>
                <p className="mt-2 font-display text-2xl">
                  {stats.currencyCount}
                </p>
              </div>
              <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/35">
                  Adds
                </p>
                <p className="mt-2 font-display text-2xl">{stats.addCount}</p>
              </div>
              <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/35">
                  Subs
                </p>
                <p className="mt-2 font-display text-2xl">{stats.subCount}</p>
              </div>
            </section>

            <section className="mt-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/35">
                    Recurring
                  </p>
                  <p className="mt-2 font-display text-2xl">{stats.totalRules}</p>
                </div>
                <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/35">
                    Budget rows
                  </p>
                  <p className="mt-2 font-display text-2xl">{stats.totalBudget}</p>
                </div>
                <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/35">
                    Goals
                  </p>
                  <p className="mt-2 font-display text-2xl">{stats.totalGoal}</p>
                </div>
              </div>
            </section>

            <section className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-xl">Primary wallets</h2>
              </div>
              {primaryByKind.length === 0 ? (
                <p className="text-wheat/40 text-sm py-6 text-center">
                  No wallets yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {primaryByKind.map((account) => (
                    <div
                      key={account.id}
                      className="rounded-3xl border border-wheat/10 bg-wheat/5 px-4 py-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/35">
                            {account.kind}
                          </p>
                          <p className="font-display text-xl mt-1">
                            {account.currency}
                          </p>
                        </div>
                        <p className="font-mono text-lg tabular-nums">
                          {account.balance.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-6">
              <h2 className="font-display text-xl mb-3">Top categories</h2>
              {categoryTotals.length === 0 ? (
                <p className="text-wheat/40 text-sm py-6 text-center">
                  No categorized spending yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {categoryTotals.map((entry) => {
                    const max = categoryTotals[0]?.amount ?? 1;
                    const width = max > 0 ? (entry.amount / max) * 100 : 0;
                    return (
                      <div
                        key={entry.category}
                        className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium capitalize">{entry.category}</p>
                          <p className="font-mono text-sm tabular-nums">
                            {entry.amount.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-wheat/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-clay"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-6">
              <h2 className="font-display text-xl mb-3">People tracking</h2>
              <div className="grid gap-3">
                <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/35">
                    Spent for people
                  </p>
                  {peopleTotals.spent.length === 0 ? (
                    <p className="text-wheat/40 text-sm py-4 text-center">
                      No person-linked spending yet.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {peopleTotals.spent.map(({ person, amount }) => (
                        <div key={person.id} className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{person.name}</p>
                            <p className="text-xs text-wheat/45">
                              {person.relation || "Person"}
                            </p>
                          </div>
                          <p className="font-mono text-sm tabular-nums">
                            {amount.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/35">
                    Money from people
                  </p>
                  {peopleTotals.received.length === 0 ? (
                    <p className="text-wheat/40 text-sm py-4 text-center">
                      No repayments or family money yet.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {peopleTotals.received.map(({ person, amount }) => (
                        <div key={person.id} className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{person.name}</p>
                            <p className="text-xs text-wheat/45">
                              {person.relation || "Person"}
                            </p>
                          </div>
                          <p className="font-mono text-sm tabular-nums">
                            {amount.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-6">
              <h2 className="font-display text-xl mb-3">Recent activity</h2>
              {transactions.length === 0 ? (
                <p className="text-wheat/40 text-sm py-6 text-center">
                  No transactions yet.
                </p>
              ) : (
                <div>
                  {transactions.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
