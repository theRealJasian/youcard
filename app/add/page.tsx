"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRightLeft, Gift, HandCoins, Users } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TransactionForm from "@/components/TransactionForm";

function AddInner() {
  const router = useRouter();
  const params = useSearchParams();
  const accountId = params.get("account");
  const mode = params.get("mode");

  const validMode = mode === "repayment" || mode === "family" ? mode : null;

  return (
    <main className="screen">
      <header className="pt-6 pb-2">
        <h1 className="font-display text-2xl">Add</h1>
      </header>
      {accountId ? (
        validMode ? (
          <TransactionForm accountId={accountId} kind="add" mode={validMode} />
        ) : (
          <motion.div
            className="flex-1 flex items-center justify-center pt-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="w-full rounded-[32px] border border-wheat/10 bg-[#171a13] p-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="h-11 w-11 rounded-full bg-clay/15 text-clay flex items-center justify-center">
                  <ArrowRightLeft size={20} />
                </span>
                <div>
                  <p className="font-display text-xl">Choose add type</p>
                  <p className="text-xs text-wheat/45 mt-1">
                    Pick what kind of money just came in.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                <button
                  onClick={() => router.replace(`/add?account=${accountId}&mode=repayment`)}
                  className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-full bg-clay/15 text-clay flex items-center justify-center">
                      <HandCoins size={18} />
                    </span>
                    <div>
                      <p className="font-medium">Someone paid me back</p>
                      <p className="text-xs text-wheat/45 mt-1">
                        Track money returned by a friend.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => router.replace(`/add?account=${accountId}&mode=family`)}
                  className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-full bg-clay/15 text-clay flex items-center justify-center">
                      <Gift size={18} />
                    </span>
                    <div>
                      <p className="font-medium">Money from parents or grandparents</p>
                      <p className="text-xs text-wheat/45 mt-1">
                        Track support, gifts, or allowance.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )
      ) : (
        <p className="text-wheat/40 text-sm py-8 text-center">
          No account selected.
        </p>
      )}
      <BottomNav />
    </main>
  );
}

export default function AddPage() {
  return (
    <Suspense fallback={null}>
      <AddInner />
    </Suspense>
  );
}
