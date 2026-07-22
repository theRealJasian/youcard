"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import DigitalReceiptShare from "@/components/DigitalReceiptShare";
import { formatAmount } from "@/lib/currency";
import type { Transaction } from "@/lib/types";

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("transactions")
      .select("*, account:accounts!transactions_account_id_fkey(*), transfer_account:accounts!transactions_transfer_account_id_fkey(*), person:gift_people!transactions_person_id_fkey(*), split_expense:split_expenses(*)")
      .eq("id", id)
      .single()
      .then(
        ({
          data,
          error,
        }: {
          data: Transaction | null;
          error: unknown;
        }) => {
        if (!active) return;
        if (error) console.warn(error);
        setTx((data as Transaction) ?? null);
        setLoading(false);
        }
      );
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;

    async function loadReceipt() {
      if (!tx?.receipt_path) {
        setReceiptUrl(tx?.receipt_url ?? null);
        return;
      }

      const { data } = await supabase.storage
        .from("receipts")
        .createSignedUrl(tx.receipt_path, 60 * 60 * 24 * 7);

      if (!active) return;
      setReceiptUrl(data?.signedUrl ?? tx.receipt_url ?? null);
    }

    void loadReceipt();

    return () => {
      active = false;
    };
  }, [tx]);

  async function handleDelete() {
    if (!tx) return;
    if (!confirm("Delete this transaction? This can't be undone.")) return;
    if (tx.kind === "transfer" && tx.transfer_account_id) {
      await supabase.rpc("transfer_balance", {
        p_from_account_id: tx.transfer_account_id,
        p_to_account_id: tx.account_id,
        p_amount: tx.amount,
      });
    } else {
      // Reverse the balance change, then delete.
      const sign = tx.kind === "add" ? -1 : 1;
      await supabase.rpc("adjust_balance", {
        p_account_id: tx.account_id,
        p_delta: sign * tx.amount,
      });
    }
    await supabase.from("transactions").delete().eq("id", tx.id);
    router.push("/transactions");
  }

  if (loading) {
    return (
      <main className="screen">
        <p className="text-wheat/40 text-sm py-8 text-center">Loading…</p>
        <BottomNav />
      </main>
    );
  }

  if (!tx) {
    return (
      <main className="screen">
        <p className="text-wheat/40 text-sm py-8 text-center">
          Transaction not found.
        </p>
        <BottomNav />
      </main>
    );
  }

  const date = new Date(tx.created_at);
  const dateLabel = date.toLocaleDateString("en-GB");
  const currency = tx.account?.currency ?? "";
  const transferCurrency = tx.transfer_account?.currency ?? "";

  return (
    <main className="screen">
      <header className="pt-6 pb-2 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl">Transaction details</h1>
          <p className="text-wheat/50 text-sm mt-1">{dateLabel}</p>
        </div>
        <button
          onClick={handleDelete}
          className="text-xs uppercase tracking-wide border border-wheat/30 rounded-full px-3 py-1.5 text-wheat/70"
        >
          Delete
        </button>
      </header>

      <section className="flex-1 mt-2">
        <p className="text-wheat/50 text-sm border-b border-wheat/10 pb-2">
          {tx.items?.length ?? 0} item{(tx.items?.length ?? 0) === 1 ? "" : "s"}
        </p>

        {tx.merchant && (
          <p className="mt-3 text-sm text-wheat/75">{tx.merchant}</p>
        )}

        {tx.category && (
          <p className="mt-3 text-xs uppercase tracking-[0.24em] text-clay">
            {tx.category}
          </p>
        )}

        {tx.note && <p className="mt-2 text-wheat/70 text-sm">{tx.note}</p>}

        {tx.kind === "transfer" && (
          <p className="mt-3 text-sm text-wheat/55">
            Transfer from {tx.account?.kind ?? "source"} {currency} to{" "}
            {tx.transfer_account?.kind ?? "destination"} {transferCurrency}
          </p>
        )}

        {tx.person && (
          <p className="mt-3 text-sm text-wheat/55">
            {tx.person_role === "for" ? "For" : "From"} {tx.person.name}
            {tx.person.relation ? ` · ${tx.person.relation}` : ""}
          </p>
        )}

        {tx.split_expense && (
          <p className="mt-2 text-sm text-wheat/55">
            Shared expense: {tx.split_expense.title}
          </p>
        )}

        <ul className="mt-2">
          {tx.items?.map((item, i) => (
            <li
              key={i}
              className="flex items-center justify-between py-3 border-b border-wheat/10"
            >
              <span className="text-wheat/80">{item.name}</span>
              <span className="font-mono tabular-nums text-wheat/80">
                {formatAmount(item.price)}
              </span>
            </li>
          ))}
        </ul>

        {receiptUrl && (
          <div className="mt-5">
            <p className="text-xs uppercase tracking-wide text-wheat/40 mb-2">
              Receipt
            </p>
            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-wheat/15">
              <Image
                src={receiptUrl}
                alt="Receipt"
                fill
                className="object-cover"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-wheat/20">
          <span className="text-wheat/60 text-sm">Total</span>
          <span className="font-mono text-lg tabular-nums">
            {tx.kind === "transfer" ? "↔" : tx.kind === "add" ? "+" : "-"}
            {formatAmount(tx.amount)}{" "}
            {tx.kind === "transfer" ? transferCurrency || currency : currency}
          </span>
        </div>

        {tx.person ? <DigitalReceiptShare tx={tx} /> : null}
      </section>

      <BottomNav />
    </main>
  );
}
