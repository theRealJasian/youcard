"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import type { Account } from "@/lib/types";

function WalletsInner() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newKindName, setNewKindName] = useState("");
  const [newKindCurrency, setNewKindCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .order("kind", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) console.error(error);
    setAccounts((data as Account[] | null) ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  const walletKinds = useMemo(() => {
    const seen = new Map<string, Account[]>();
    for (const account of accounts) {
      const group = seen.get(account.kind) ?? [];
      group.push(account);
      seen.set(account.kind, group);
    }
    return Array.from(seen.entries()).map(([kind, kindAccounts]) => ({
      kind,
      accounts: kindAccounts.sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          Number(b.is_primary) - Number(a.is_primary)
      ),
    }));
  }, [accounts]);

  async function createKind() {
    const kindName = newKindName.trim().toLowerCase();
    const currency = newKindCurrency.trim().toUpperCase() || "USD";
    if (!kindName || saving) return;

    if (walletKinds.some((wallet) => wallet.kind === kindName)) {
      setShowAdd(false);
      setNewKindName("");
      setNewKindCurrency("USD");
      router.push(`/currencies?kind=${kindName}`);
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("accounts").insert({
      kind: kindName,
      currency,
      balance: 0,
      is_primary: true,
      sort_order: 0,
    });

    if (error) {
      console.error(error);
      setSaving(false);
      return;
    }

    await load();
    setSaving(false);
    setShowAdd(false);
    setNewKindName("");
    setNewKindCurrency("USD");
    router.push(`/currencies?kind=${kindName}`);
  }

  return (
    <main className="screen">
      <header className="pt-6 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl">Wallets</h1>
            <p className="text-wheat/45 text-sm mt-1">
              Manage account types and currencies here.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="h-10 w-10 rounded-full border border-wheat/15 flex items-center justify-center text-wheat/60 active:scale-95 transition"
            aria-label="Add account type"
          >
            <Plus size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 mt-2">
        {walletKinds.length === 0 ? (
          <div className="py-10 text-center">
            <Wallet className="mx-auto text-wheat/25" size={28} />
            <p className="text-wheat/60 mt-3">No wallets yet.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 text-clay underline underline-offset-4"
            >
              Add your first wallet type
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {walletKinds.map(({ kind, accounts: kindAccounts }) => {
              const primary = kindAccounts.find((account) => account.is_primary);
              return (
                <button
                  key={kind}
                  onClick={() => router.push(`/currencies?kind=${kind}`)}
                  className="w-full rounded-3xl border border-wheat/10 bg-wheat/5 px-4 py-4 text-left"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-wheat/35">
                        Wallet type
                      </p>
                      <h2 className="font-display text-xl capitalize mt-1">
                        {kind}
                      </h2>
                      <p className="text-sm text-wheat/50 mt-1">
                        {kindAccounts.length} {kindAccounts.length === 1 ? "currency" : "currencies"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/35">
                        Primary
                      </p>
                      <p className="mt-1 font-mono text-lg text-wheat/80">
                        {primary?.currency ?? "—"}
                      </p>
                      <p className="text-xs text-wheat/45">
                        {primary ? primary.balance.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        }) : "0.00"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-wheat/45">
                    <span>Manage currencies</span>
                    <ArrowRight size={16} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <div className="w-full max-w-[480px] rounded-3xl border border-wheat/10 bg-[#151812] p-5 shadow-2xl">
            <div className="mb-4">
              <p className="font-display text-xl">Add wallet type</p>
              <p className="text-xs text-wheat/45 mt-1">
                Start a new wallet and set its first currency.
              </p>
            </div>

            <label className="block text-[11px] uppercase tracking-[0.24em] text-wheat/40 mb-1">
              Type name
            </label>
            <input
              value={newKindName}
              onChange={(e) => setNewKindName(e.target.value)}
              placeholder="Travel"
              className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay mb-4"
            />

            <label className="block text-[11px] uppercase tracking-[0.24em] text-wheat/40 mb-1">
              Default currency
            </label>
            <input
              value={newKindCurrency}
              onChange={(e) => setNewKindCurrency(e.target.value)}
              placeholder="USD"
              className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay"
              maxLength={3}
            />

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-full border border-wheat/20 py-3 text-wheat/60"
              >
                Cancel
              </button>
              <button
                onClick={createKind}
                disabled={saving || !newKindName.trim()}
                className="flex-1 rounded-full bg-clay text-ink font-medium py-3 disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}

export default function WalletsPage() {
  return (
    <Suspense fallback={null}>
      <WalletsInner />
    </Suspense>
  );
}
