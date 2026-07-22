"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Repeat2, Target, Trash2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";
import type { Account, Budget, Goal, RecurringRule, Transaction } from "@/lib/types";

const CADENCES = ["weekly", "biweekly", "monthly"] as const;

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatShortDate(value: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
}

function nextRunDate(cadence: string, base = new Date()) {
  const next = new Date(base);
  if (cadence === "weekly") next.setDate(next.getDate() + 7);
  else if (cadence === "biweekly") next.setDate(next.getDate() + 14);
  else next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

export default function PlannerPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [rules, setRules] = useState<RecurringRule[]>([]);

  const [budgetName, setBudgetName] = useState("");
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetPeriod, setBudgetPeriod] = useState("monthly");

  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalWalletKind, setGoalWalletKind] = useState("");

  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleKind, setRuleKind] = useState<RecurringRule["kind"]>("add");
  const [ruleAccountId, setRuleAccountId] = useState("");
  const [ruleTransferAccountId, setRuleTransferAccountId] = useState("");
  const [ruleAmount, setRuleAmount] = useState("");
  const [ruleCategory, setRuleCategory] = useState("");
  const [ruleNote, setRuleNote] = useState("");
  const [ruleCadence, setRuleCadence] = useState<(typeof CADENCES)[number]>("monthly");

  useEffect(() => {
    let active = true;

    async function load() {
      const [accountsRes, txRes, budgetsRes, goalsRes, rulesRes] = await Promise.all([
        supabase.from("accounts").select("*").order("kind", { ascending: true }).order("sort_order", { ascending: true }),
        supabase
          .from("transactions")
          .select("*, account:accounts!transactions_account_id_fkey(*), transfer_account:accounts!transactions_transfer_account_id_fkey(*), person:gift_people!transactions_person_id_fkey(*)")
          .order("created_at", { ascending: false }),
        supabase.from("budgets").select("*").order("created_at", { ascending: false }),
        supabase.from("goals").select("*").order("created_at", { ascending: false }),
        supabase.from("recurring_rules").select("*").order("created_at", { ascending: false }),
      ]);

      if (!active) return;
      if (accountsRes.error) console.warn(accountsRes.error);
      if (txRes.error) console.warn(txRes.error);
      if (budgetsRes.error) console.warn(budgetsRes.error);
      if (goalsRes.error) console.warn(goalsRes.error);
      if (rulesRes.error) console.warn(rulesRes.error);

      const nextAccounts = (accountsRes.data as Account[] | null) ?? [];
      setAccounts(nextAccounts);
      setTransactions((txRes.data as Transaction[] | null) ?? []);
      setBudgets((budgetsRes.data as Budget[] | null) ?? []);
      setGoals((goalsRes.data as Goal[] | null) ?? []);
      setRules((rulesRes.data as RecurringRule[] | null) ?? []);

      setRuleAccountId((current) => current || nextAccounts[0]?.id || "");
      setRuleTransferAccountId((current) => current || nextAccounts[1]?.id || nextAccounts[0]?.id || "");
      setGoalWalletKind((current) => current || nextAccounts[0]?.kind || "");
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const walletKinds = useMemo(
    () => Array.from(new Set(accounts.map((account) => account.kind))),
    [accounts]
  );

  const monthlySpendByCategory = useMemo(() => {
    const start = monthStart();
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.kind !== "sub" || !tx.category) continue;
      const created = new Date(tx.created_at);
      if (created < start) continue;
      map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
    }
    return map;
  }, [transactions]);

  async function refresh() {
    const [budgetsRes, goalsRes, rulesRes, txRes, accountsRes] = await Promise.all([
      supabase.from("budgets").select("*").order("created_at", { ascending: false }),
      supabase.from("goals").select("*").order("created_at", { ascending: false }),
      supabase.from("recurring_rules").select("*").order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("*, account:accounts!transactions_account_id_fkey(*), transfer_account:accounts!transactions_transfer_account_id_fkey(*), person:gift_people!transactions_person_id_fkey(*)")
        .order("created_at", { ascending: false }),
      supabase.from("accounts").select("*").order("kind", { ascending: true }).order("sort_order", { ascending: true }),
    ]);

    if (budgetsRes.data) setBudgets(budgetsRes.data as Budget[]);
    if (goalsRes.data) setGoals(goalsRes.data as Goal[]);
    if (rulesRes.data) setRules(rulesRes.data as RecurringRule[]);
    if (txRes.data) setTransactions(txRes.data as Transaction[]);
    if (accountsRes.data) setAccounts(accountsRes.data as Account[]);
  }

  async function createBudget() {
    const amount = Number(budgetAmount);
    if (!budgetName.trim() || !budgetCategory.trim() || !amount || amount <= 0) return;
    const { error } = await supabase.from("budgets").insert({
      name: budgetName.trim(),
      category: budgetCategory.trim(),
      amount,
      period: budgetPeriod,
    });
    if (error) console.warn(error);
    setBudgetName("");
    setBudgetCategory("");
    setBudgetAmount("");
    await refresh();
  }

  async function deleteBudget(id: string) {
    await supabase.from("budgets").delete().eq("id", id);
    await refresh();
  }

  async function createGoal() {
    const amount = Number(goalTarget);
    if (!goalName.trim() || !amount || amount <= 0) return;
    const { error } = await supabase.from("goals").insert({
      name: goalName.trim(),
      target_amount: amount,
      current_amount: 0,
      wallet_kind: goalWalletKind.trim() || null,
    });
    if (error) console.warn(error);
    setGoalName("");
    setGoalTarget("");
    await refresh();
  }

  async function adjustGoal(goal: Goal, delta: number) {
    const nextValue = Math.max(0, Number(goal.current_amount) + delta);
    await supabase.from("goals").update({ current_amount: nextValue }).eq("id", goal.id);
    await refresh();
  }

  async function createRule() {
    const amount = Number(ruleAmount);
    if (!ruleTitle.trim() || !ruleAccountId || !amount || amount <= 0) return;
    const { error } = await supabase.from("recurring_rules").insert({
      title: ruleTitle.trim(),
      kind: ruleKind,
      account_id: ruleAccountId,
      transfer_account_id: ruleKind === "transfer" ? ruleTransferAccountId : null,
      amount,
      category: ruleCategory.trim() || null,
      note: ruleNote.trim() || null,
      cadence: ruleCadence,
      next_run_at: nextRunDate(ruleCadence),
    });
    if (error) console.warn(error);
    setRuleTitle("");
    setRuleAmount("");
    setRuleCategory("");
    setRuleNote("");
    await refresh();
  }

  async function deleteRule(id: string) {
    await supabase.from("recurring_rules").delete().eq("id", id);
    await refresh();
  }

  async function runRule(rule: RecurringRule) {
    const source = accounts.find((account) => account.id === rule.account_id);
    const target = rule.transfer_account_id
      ? accounts.find((account) => account.id === rule.transfer_account_id)
      : null;
    if (!source) return;

    if (rule.kind === "transfer" && target) {
      const { error } = await supabase.rpc("transfer_balance", {
        p_from_account_id: source.id,
        p_to_account_id: target.id,
        p_amount: rule.amount,
      });
      if (error) {
        console.warn(error);
        return;
      }
    } else {
      const delta = rule.kind === "add" ? rule.amount : -rule.amount;
      const { error } = await supabase.rpc("adjust_balance", {
        p_account_id: source.id,
        p_delta: delta,
      });
      if (error) {
        console.warn(error);
        return;
      }
    }

    const { error: txError } = await supabase.from("transactions").insert({
      account_id: source.id,
      transfer_account_id: rule.kind === "transfer" ? target?.id ?? null : null,
      kind: rule.kind,
      amount: rule.amount,
      items: [],
      note: rule.note || rule.title,
      category: rule.category || "recurring",
    });
    if (txError) console.warn(txError);

    await supabase
      .from("recurring_rules")
      .update({ next_run_at: nextRunDate(rule.cadence) })
      .eq("id", rule.id);
    await refresh();
  }

  const budgetRows = budgets.map((budget) => {
    const spent = monthlySpendByCategory.get(budget.category) ?? 0;
    const progress = budget.amount > 0 ? Math.min(100, (spent / budget.amount) * 100) : 0;
    return { budget, spent, progress };
  });

  return (
    <main className="screen">
      <header className="pt-6 pb-2">
        <h1 className="font-display text-2xl">Planner</h1>
        <p className="text-wheat/45 text-sm mt-1">
          Budgets, goals, and recurring templates.
        </p>
      </header>

      <div className="flex-1 mt-2 space-y-6">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-9 w-9 rounded-full border border-wheat/15 flex items-center justify-center text-clay">
              <Repeat2 size={18} />
            </span>
            <h2 className="font-display text-xl">Budgets</h2>
          </div>

          <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
            <div className="grid gap-3">
              <input
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                placeholder="Budget name"
                className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                  placeholder="Category"
                  className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay"
                />
                <input
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="Amount"
                  inputMode="decimal"
                  className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay font-mono"
                />
              </div>
              <select
                value={budgetPeriod}
                onChange={(e) => setBudgetPeriod(e.target.value)}
                className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay capitalize"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <button
                onClick={createBudget}
                className="rounded-full bg-clay text-ink py-3 font-medium"
              >
                Add budget
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {budgetRows.length === 0 ? (
              <p className="text-wheat/40 text-sm py-4 text-center">No budgets yet.</p>
            ) : (
              budgetRows.map(({ budget, spent, progress }) => (
                <div
                  key={budget.id}
                  className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{budget.name}</p>
                      <p className="text-xs uppercase tracking-[0.24em] text-wheat/35 mt-1">
                        {budget.category} · {budget.period}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteBudget(budget.id)}
                      className="text-wheat/35"
                      aria-label={`Delete budget ${budget.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-wheat/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-clay"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-wheat/45">
                    <span>{spent.toLocaleString("en-US", { minimumFractionDigits: 2 })} spent</span>
                    <span>{budget.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-9 w-9 rounded-full border border-wheat/15 flex items-center justify-center text-clay">
              <Target size={18} />
            </span>
            <h2 className="font-display text-xl">Goals</h2>
          </div>

          <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
            <div className="grid gap-3">
              <input
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="Goal name"
                className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  placeholder="Target"
                  inputMode="decimal"
                  className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay font-mono"
                />
                <select
                  value={goalWalletKind}
                  onChange={(e) => setGoalWalletKind(e.target.value)}
                  className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay capitalize"
                >
                  <option value="">Any wallet</option>
                  {walletKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={createGoal}
                className="rounded-full bg-clay text-ink py-3 font-medium"
              >
                Add goal
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {goals.length === 0 ? (
              <p className="text-wheat/40 text-sm py-4 text-center">No goals yet.</p>
            ) : (
              goals.map((goal) => {
                const progress = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
                return (
                  <div
                    key={goal.id}
                    className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{goal.name}</p>
                        <p className="text-xs uppercase tracking-[0.24em] text-wheat/35 mt-1">
                          {goal.wallet_kind || "Any wallet"}
                        </p>
                      </div>
                      <button
                        onClick={() => supabase.from("goals").delete().eq("id", goal.id).then(refresh)}
                        className="text-wheat/35"
                        aria-label={`Delete goal ${goal.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-wheat/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-good"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-wheat/45">
                      <span>{goal.current_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} saved</span>
                      <span>{goal.target_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => adjustGoal(goal, 10)}
                        className="flex-1 rounded-full border border-wheat/15 py-2 text-sm"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => adjustGoal(goal, -10)}
                        className="flex-1 rounded-full border border-wheat/15 py-2 text-sm"
                      >
                        -10
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-9 w-9 rounded-full border border-wheat/15 flex items-center justify-center text-clay">
              <CalendarClock size={18} />
            </span>
            <h2 className="font-display text-xl">Recurring</h2>
          </div>

          <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
            <div className="grid gap-3">
              <input
                value={ruleTitle}
                onChange={(e) => setRuleTitle(e.target.value)}
                placeholder="Subscription name"
                className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={ruleKind}
                  onChange={(e) => setRuleKind(e.target.value as RecurringRule["kind"])}
                  className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay capitalize"
                >
                  <option value="add">Add</option>
                  <option value="sub">Subtract</option>
                  <option value="transfer">Transfer</option>
                </select>
                <select
                  value={ruleCadence}
                  onChange={(e) => setRuleCadence(e.target.value as (typeof CADENCES)[number])}
                  className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay capitalize"
                >
                  {CADENCES.map((cadence) => (
                    <option key={cadence} value={cadence}>
                      {cadence}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={ruleAccountId}
                  onChange={(e) => setRuleAccountId(e.target.value)}
                  className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay capitalize"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.kind} · {account.currency}
                    </option>
                  ))}
                </select>
                <select
                  value={ruleTransferAccountId}
                  onChange={(e) => setRuleTransferAccountId(e.target.value)}
                  className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay capitalize"
                  disabled={ruleKind !== "transfer"}
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.kind} · {account.currency}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={ruleAmount}
                  onChange={(e) => setRuleAmount(e.target.value)}
                  placeholder="Amount"
                  inputMode="decimal"
                  className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay font-mono"
                />
                <input
                  value={ruleCategory}
                  onChange={(e) => setRuleCategory(e.target.value)}
                  placeholder="Category"
                  className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay"
                />
              </div>
              <input
                value={ruleNote}
                onChange={(e) => setRuleNote(e.target.value)}
                placeholder="Note"
                className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay"
              />
              <button
                onClick={createRule}
                className="rounded-full bg-clay text-ink py-3 font-medium"
              >
                Add recurring rule
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {rules.length === 0 ? (
              <p className="text-wheat/40 text-sm py-4 text-center">
                No recurring rules yet.
              </p>
            ) : (
              rules.map((rule) => {
                const source = accounts.find((account) => account.id === rule.account_id);
                const target = accounts.find((account) => account.id === rule.transfer_account_id);
                return (
                  <div
                    key={rule.id}
                    className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{rule.title}</p>
                        <p className="text-xs uppercase tracking-[0.24em] text-wheat/35 mt-1">
                          {rule.kind} · {rule.cadence} · {formatShortDate(rule.next_run_at)}
                        </p>
                        <p className="text-xs text-wheat/50 mt-1">
                          {source?.kind ?? "?"} · {source?.currency ?? "?"}
                          {target ? ` → ${target.kind} · ${target.currency}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="text-wheat/35"
                        aria-label={`Delete recurring rule ${rule.title}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => runRule(rule)}
                        className="flex-1 rounded-full bg-clay text-ink py-2 text-sm font-medium"
                      >
                        Run now
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/35">
            Quick stats
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-display text-xl">{budgets.length}</p>
              <p className="text-xs text-wheat/45">Budgets</p>
            </div>
            <div>
              <p className="font-display text-xl">{goals.length}</p>
              <p className="text-xs text-wheat/45">Goals</p>
            </div>
            <div>
              <p className="font-display text-xl">{rules.length}</p>
              <p className="text-xs text-wheat/45">Recurring</p>
            </div>
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
