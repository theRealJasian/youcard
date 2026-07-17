"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowDownLeft, Gift, UserRound } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TransactionForm from "@/components/TransactionForm";

function SubInner() {
  const router = useRouter();
  const params = useSearchParams();
  const accountId = params.get("account");
  const mode = params.get("mode");

  const validMode = mode === "self" || mode === "person" ? mode : null;

  return (
    <main className="screen">
      <header className="pt-6 pb-2">
        <h1 className="font-display text-2xl">Subtract</h1>
      </header>
      {accountId ? (
        validMode ? (
          <TransactionForm accountId={accountId} kind="sub" mode={validMode} />
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
                  <ArrowDownLeft size={20} />
                </span>
                <div>
                  <p className="font-display text-xl">Choose subtract type</p>
                  <p className="text-xs text-wheat/45 mt-1">
                    Pick whether this is for you or for someone else.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                <button
                  onClick={() => router.replace(`/sub?account=${accountId}&mode=self`)}
                  className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-full bg-clay/15 text-clay flex items-center justify-center">
                      <UserRound size={18} />
                    </span>
                    <div>
                      <p className="font-medium">For myself</p>
                      <p className="text-xs text-wheat/45 mt-1">
                        Regular spending that is just yours.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => router.replace(`/sub?account=${accountId}&mode=person`)}
                  className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-full bg-clay/15 text-clay flex items-center justify-center">
                      <Gift size={18} />
                    </span>
                    <div>
                      <p className="font-medium">For a friend</p>
                      <p className="text-xs text-wheat/45 mt-1">
                        Track how much you spend on each person.
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

export default function SubPage() {
  return (
    <Suspense fallback={null}>
      <SubInner />
    </Suspense>
  );
}
