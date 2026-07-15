"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import TransactionForm from "@/components/TransactionForm";

function SubInner() {
  const params = useSearchParams();
  const accountId = params.get("account");

  return (
    <main className="screen">
      <header className="pt-6 pb-2">
        <h1 className="font-display text-2xl">Subtract</h1>
      </header>
      {accountId ? (
        <TransactionForm accountId={accountId} kind="sub" />
      ) : (
        <p className="text-wheat/40 text-sm py-8 text-center">
          No account selected.
        </p>
      )}
      <BottomNav />
    </main>
  );
}

export default function SubPage() {
  return (
    <Suspense fallback={null}>
      <SubInner />
    </Suspense>
  );
}
