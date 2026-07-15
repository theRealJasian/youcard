"use client";

import BottomNav from "@/components/BottomNav";
import TransferForm from "@/components/TransferForm";

export default function TransferPage() {
  return (
    <main className="screen">
      <header className="pt-6 pb-2">
        <h1 className="font-display text-2xl">Transfer</h1>
        <p className="text-wheat/45 text-sm mt-1">
          Move money between wallets or currencies.
        </p>
      </header>
      <TransferForm />
      <BottomNav />
    </main>
  );
}
