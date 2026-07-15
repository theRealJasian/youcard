"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Account } from "@/lib/types";

export default function TransferForm() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("transfer");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from("accounts")
      .select("*")
      .order("kind", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .then(({ data, error }: { data: Account[] | null; error: unknown }) => {
        if (!active) return;
        if (error) console.warn(error);
        const nextAccounts = (data as Account[] | null) ?? [];
        setAccounts(nextAccounts);
        setFromId((current) => current || nextAccounts[0]?.id || "");
        setToId((current) => current || nextAccounts[1]?.id || nextAccounts[0]?.id || "");
      });
    return () => {
      active = false;
    };
  }, []);

  const fromAccount = useMemo(
    () => accounts.find((account) => account.id === fromId) ?? null,
    [accounts, fromId]
  );
  const toAccount = useMemo(
    () => accounts.find((account) => account.id === toId) ?? null,
    [accounts, toId]
  );

  async function handleTransfer() {
    if (!fromAccount || !toAccount || fromAccount.id === toAccount.id) return;
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) return;
    setSaving(true);

    const { error: balanceError } = await supabase.rpc("transfer_balance", {
      p_from_account_id: fromAccount.id,
      p_to_account_id: toAccount.id,
      p_amount: numericAmount,
    });
    if (balanceError) {
      console.warn(balanceError);
      setSaving(false);
      return;
    }

    const { error: txError } = await supabase.from("transactions").insert({
      account_id: fromAccount.id,
      transfer_account_id: toAccount.id,
      kind: "transfer",
      amount: numericAmount,
      items: [],
      note: note || `Transfer to ${toAccount.currency}`,
      category: category.trim() || "transfer",
    });
    if (txError) console.warn(txError);

    setSaving(false);
    router.push("/transactions");
  }

  return (
    <div className="flex-1 mt-2">
      <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
        <div className="grid gap-4">
          <div>
            <label className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
              From
            </label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="mt-1 w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.kind} · {account.currency}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
              To
            </label>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="mt-1 w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.kind} · {account.currency}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center">
            <ArrowRightLeft className="text-clay" />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
              Amount
            </label>
            <input
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full bg-transparent border-b border-wheat/20 py-2 font-mono outline-none focus:border-clay"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
              Category
            </label>
            <input
              placeholder="transfer"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
              Note
            </label>
            <input
              placeholder="Optional note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => router.back()}
            className="flex-1 rounded-full border border-wheat/20 py-3 text-wheat/60 inline-flex items-center justify-center gap-2"
          >
            <X size={16} />
            Cancel
          </button>
          <button
            onClick={handleTransfer}
            disabled={saving || !fromId || !toId || fromId === toId}
            className="flex-1 rounded-full bg-clay text-ink font-medium py-3 disabled:opacity-50"
          >
            {saving ? "Transferring…" : "Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
}
