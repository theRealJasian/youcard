"use client";

import { useEffect, useState } from "react";
import { Sparkles, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Account, GiftPerson } from "@/lib/types";

const PRESETS = [
  { title: "Lunch", note: "Split lunch or dinner" },
  { title: "Taxi", note: "Ride share or cab" },
  { title: "Tickets", note: "Movie, event, or entry fee" },
  { title: "Snacks", note: "Shared snacks or drinks" },
] as const;

export default function SplitExpenseForm({
  accounts,
  people,
  defaultPersonId,
  onCreated,
}: {
  accounts: Account[];
  people: GiftPerson[];
  defaultPersonId: string;
  onCreated?: () => Promise<void> | void;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<string[]>([defaultPersonId]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accountId && accounts[0]?.id) {
      setAccountId(accounts[0].id);
    }
  }, [accountId, accounts]);

  useEffect(() => {
    setSelectedPeople((current) =>
      current.length > 0 ? current : [defaultPersonId]
    );
  }, [defaultPersonId]);

  function togglePerson(personId: string) {
    setSelectedPeople((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId]
    );
  }

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setTitle(preset.title);
    setNote(preset.note);
  }

  async function handleSave() {
    const amountValue = Number(amount);
    if (!accountId || !title.trim() || !Number.isFinite(amountValue) || amountValue <= 0) return;

    const participantIds = selectedPeople.length > 0 ? selectedPeople : [defaultPersonId];
    const shareAmount = amountValue / participantIds.length;
    if (!Number.isFinite(shareAmount) || shareAmount <= 0) return;

    setSaving(true);

    const { data: splitData, error: splitError } = await supabase
      .from("split_expenses")
      .insert({
        title: title.trim(),
        account_id: accountId,
        amount: amountValue,
        note: note.trim() || null,
        split_type: "equal",
      })
      .select("*")
      .single();

    if (splitError || !splitData) {
      console.warn(splitError);
      setSaving(false);
      return;
    }

    const { data: txData, error: txError } = await supabase
      .from("transactions")
      .insert({
        account_id: accountId,
        kind: "sub",
        amount: amountValue,
        items: [],
        note: note.trim() || title.trim(),
        category: "split",
        split_expense_id: splitData.id,
      })
      .select("id")
      .single();

    if (txError) {
      console.warn(txError);
    } else if (txData?.id) {
      const { error: linkError } = await supabase
        .from("split_expenses")
        .update({ transaction_id: txData.id })
        .eq("id", splitData.id);
      if (linkError) console.warn(linkError);
    }

    const { error: sharesError } = await supabase.from("split_expense_shares").insert(
      participantIds.map((personId) => ({
        split_expense_id: splitData.id,
        person_id: personId,
        share_amount: shareAmount,
        note: null,
      }))
    );
    if (sharesError) console.warn(sharesError);

    const { error: balanceError } = await supabase.rpc("adjust_balance", {
      p_account_id: accountId,
      p_delta: -amountValue,
    });
    if (balanceError) console.warn(balanceError);

    setTitle("");
    setAmount("");
    setNote("");
    setSelectedPeople([defaultPersonId]);
    setSaving(false);

    await onCreated?.();
  }

  return (
    <section className="rounded-[28px] border border-wheat/10 bg-[#171a13] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">Shared expense</p>
          <p className="text-xs text-wheat/45 mt-1">
            Split one purchase across multiple people.
          </p>
        </div>
        <span className="h-10 w-10 rounded-full bg-clay/15 text-clay flex items-center justify-center">
          <Sparkles size={18} />
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.title}
            onClick={() => applyPreset(preset)}
            className="rounded-full border border-wheat/15 px-3 py-1.5 text-xs text-wheat/60"
          >
            {preset.title}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.kind} · {account.currency}
            </option>
          ))}
        </select>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Expense title"
          className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
        />

        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Total amount"
          inputMode="decimal"
          className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
        />

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note"
          rows={2}
          className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay resize-none"
        />

        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-wheat/40 mb-2">
            Who owes this?
          </p>
          <div className="flex flex-wrap gap-2">
            {people.map((person) => {
              const active = selectedPeople.includes(person.id);
              return (
                <button
                  key={person.id}
                  onClick={() => togglePerson(person.id)}
                  className={`rounded-full px-3 py-1.5 text-xs border transition ${
                    active
                      ? "border-clay bg-clay/15 text-clay"
                      : "border-wheat/15 text-wheat/55"
                  }`}
                >
                  {person.name}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-wheat/45">
            {selectedPeople.length === 0
              ? "Pick at least one person."
              : `${selectedPeople.length} person${
                  selectedPeople.length > 1 ? "s" : ""
                } selected.`}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || selectedPeople.length === 0}
          aria-busy={saving}
          className="rounded-2xl bg-clay text-ink px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Plus size={16} />
          {saving ? "Saving…" : "Save split"}
        </button>
      </div>
    </section>
  );
}
