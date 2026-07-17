"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Mail, Wallet } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TransactionRow from "@/components/TransactionRow";
import SplitExpenseForm from "@/components/SplitExpenseForm";
import { supabase } from "@/lib/supabase";
import type {
  Account,
  GiftItem,
  GiftPerson,
  GiftProductAssignment,
  SplitExpenseShare,
  Transaction,
} from "@/lib/types";

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<GiftPerson | null>(null);
  const [people, setPeople] = useState<GiftPerson[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [assignments, setAssignments] = useState<GiftProductAssignment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shares, setShares] = useState<SplitExpenseShare[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [personRes, peopleRes, accountsRes, giftsRes, assignmentsRes, txRes, sharesRes] =
      await Promise.all([
        supabase.from("gift_people").select("*").eq("id", id).single(),
        supabase.from("gift_people").select("*").order("name", { ascending: true }),
        supabase
          .from("accounts")
          .select("*")
          .order("kind", { ascending: true })
          .order("sort_order", { ascending: true }),
        supabase
          .from("gift_items")
          .select("*")
          .eq("person_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("gift_product_assignments")
          .select("*, product:gift_products(*), variant:gift_product_variants(*)")
          .eq("person_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("transactions")
          .select("*, account:accounts(*), transfer_account:accounts!transactions_transfer_account_id_fkey(*), person:gift_people!transactions_person_id_fkey(*)")
          .eq("person_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("split_expense_shares")
          .select("*, split:split_expenses(*, account:accounts(*))")
          .eq("person_id", id)
          .order("created_at", { ascending: false }),
      ]);

    if (personRes.error) console.warn(personRes.error);
    if (peopleRes.error) console.warn(peopleRes.error);
    if (accountsRes.error) console.warn(accountsRes.error);
    if (giftsRes.error) console.warn(giftsRes.error);
    if (assignmentsRes.error) console.warn(assignmentsRes.error);
    if (txRes.error) console.warn(txRes.error);
    if (sharesRes.error) console.warn(sharesRes.error);

    setPerson((personRes.data as GiftPerson | null) ?? null);
    setPeople((peopleRes.data as GiftPerson[] | null) ?? []);
    setAccounts((accountsRes.data as Account[] | null) ?? []);
    setGifts((giftsRes.data as GiftItem[] | null) ?? []);
    setAssignments((assignmentsRes.data as GiftProductAssignment[] | null) ?? []);
    setTransactions((txRes.data as Transaction[] | null) ?? []);
    setShares((sharesRes.data as SplitExpenseShare[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [id]);

  const summary = useMemo(() => {
    const spent = transactions
      .filter((tx) => tx.kind === "sub" && tx.person_role === "for")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const received = transactions
      .filter((tx) => tx.kind === "add" && tx.person_role === "from")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const owed = shares
      .filter((share) => !share.is_paid)
      .reduce((sum, share) => sum + share.share_amount, 0);
    return { spent, received, owed };
  }, [shares, transactions]);

  async function markPaid(shareId: string) {
    const { error } = await supabase
      .from("split_expense_shares")
      .update({ is_paid: true })
      .eq("id", shareId);
    if (error) {
      console.warn(error);
      return;
    }
    await load();
  }

  if (loading) {
    return (
      <main className="screen">
        <p className="text-wheat/40 text-sm py-8 text-center">Loading…</p>
        <BottomNav />
      </main>
    );
  }

  if (!person) {
    return (
      <main className="screen">
        <p className="text-wheat/40 text-sm py-8 text-center">
          Person not found.
        </p>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="screen">
      <header className="pt-6 pb-3">
        <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
          Person page
        </p>
        <h1 className="font-display text-3xl mt-2">{person.name}</h1>
        <p className="text-wheat/45 text-sm mt-2">
          {person.relation || "Person"}
          {person.email ? ` · ${person.email}` : ""}
        </p>
        {person.notes ? (
          <p className="text-wheat/65 text-sm mt-3">{person.notes}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {person.email ? (
            <a
              href={`mailto:${person.email}`}
              className="rounded-full border border-wheat/15 px-3 py-1.5 text-xs text-wheat/60 inline-flex items-center gap-2"
            >
              <Mail size={14} />
              Email
            </a>
          ) : null}
          <Link
            href="/gifts"
            className="rounded-full border border-wheat/15 px-3 py-1.5 text-xs text-wheat/60 inline-flex items-center gap-2"
          >
            Gifts
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
            Spent
          </p>
          <p className="mt-2 font-display text-2xl">
            {summary.spent.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
            Received
          </p>
          <p className="mt-2 font-display text-2xl">
            {summary.received.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
            Owed
          </p>
          <p className="mt-2 font-display text-2xl">
            {summary.owed.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </section>

      <div className="space-y-5">
        <SplitExpenseForm
          accounts={accounts}
          people={people}
          defaultPersonId={person.id}
          onCreated={load}
        />

        <section className="rounded-[28px] border border-wheat/10 bg-[#171a13] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={18} className="text-clay" />
            <h2 className="font-display text-xl">Shared expenses</h2>
          </div>
          {shares.length === 0 ? (
            <p className="text-wheat/40 text-sm py-4 text-center">
              No shared expenses yet.
            </p>
          ) : (
            <div className="space-y-3">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{share.split?.title}</p>
                      <p className="text-xs text-wheat/45 mt-1">
                        {share.split?.account
                          ? `${share.split.account.kind} · ${share.split.account.currency}`
                          : "Account not loaded"}
                      </p>
                    </div>
                    <p className="font-mono text-sm tabular-nums">
                      {share.share_amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-wheat/45">
                      {share.is_paid ? "Paid back" : "Still owed"}
                    </p>
                    {share.is_paid ? (
                      <span className="text-xs text-good inline-flex items-center gap-1">
                        <Check size={13} />
                        Done
                      </span>
                    ) : (
                      <button
                        onClick={() => markPaid(share.id)}
                        className="rounded-full border border-wheat/15 px-3 py-1.5 text-xs text-wheat/60"
                      >
                        Mark paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-wheat/10 bg-[#171a13] p-4">
          <h2 className="font-display text-xl mb-3">Gifts</h2>
          {gifts.length === 0 ? (
            <p className="text-wheat/40 text-sm py-4 text-center">
              No gifts linked to this person.
            </p>
          ) : (
            <div className="grid gap-3">
              {gifts.map((gift) => (
                <div
                  key={gift.id}
                  className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4"
                >
                  <p className="font-medium">{gift.title}</p>
                  <p className="text-xs text-wheat/45 mt-1">
                    {gift.category}
                    {gift.color ? ` · ${gift.color}` : ""}
                    {gift.size ? ` · ${gift.size}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-wheat/10 bg-[#171a13] p-4">
          <h2 className="font-display text-xl mb-3">Catalog assignments</h2>
          {assignments.length === 0 ? (
            <p className="text-wheat/40 text-sm py-4 text-center">
              No product assignments yet.
            </p>
          ) : (
            <div className="grid gap-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{assignment.product?.name ?? "Product"}</p>
                      <p className="text-xs text-wheat/45 mt-1">
                        {assignment.variant?.name || "Any variant"}
                        {assignment.variant?.color ? ` · ${assignment.variant.color}` : ""}
                        {assignment.variant?.size ? ` · ${assignment.variant.size}` : ""}
                      </p>
                    </div>
                    <p className="font-mono text-sm tabular-nums">
                      x{assignment.quantity}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-wheat/45">
                    Status: {assignment.status}
                    {assignment.note ? ` · ${assignment.note}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-wheat/10 bg-[#171a13] p-4">
          <h2 className="font-display text-xl mb-3">Transactions</h2>
          {transactions.length === 0 ? (
            <p className="text-wheat/40 text-sm py-4 text-center">
              No person-linked transactions yet.
            </p>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
