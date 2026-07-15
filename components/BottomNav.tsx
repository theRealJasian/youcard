"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home,
  Clock3,
  Menu,
  X,
  Sparkles,
  Wallet,
  ArrowLeftRight,
  CalendarClock,
} from "lucide-react";

type NavLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  className?: string;
};

function NavLink({ href, label, icon: Icon, active, className }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 text-xs ${className ?? ""} ${
        active ? "text-clay" : "text-wheat/50"
      }`}
    >
      <Icon size={22} strokeWidth={2} />
      {label}
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isTx = pathname.startsWith("/transactions");
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 mx-auto max-w-[480px] px-8 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 bg-ink/95 backdrop-blur border-t border-wheat/10"
        aria-label="Primary"
      >
        <div className="grid grid-cols-3 items-center">
          <div className="justify-self-start">
            <button
              onClick={() => setOpen(true)}
              className="h-10 w-10 rounded-full border border-wheat/15 flex items-center justify-center text-wheat/60 active:scale-95 transition"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
          <div className="justify-self-center">
            <NavLink href="/" label="Home" icon={Home} active={isHome} />
          </div>
          <div className="justify-self-end">
            <NavLink
              href="/transactions"
              label="Transactions"
              icon={Clock3}
              active={isTx}
            />
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="absolute left-4 right-4 bottom-[calc(env(safe-area-inset-bottom)+72px)] mx-auto max-w-[480px] rounded-3xl border border-wheat/10 bg-[#151812] p-4 shadow-2xl"
              initial={{ y: 20, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-display text-xl">Menu</p>
                  <p className="text-xs text-wheat/45 mt-1">
                    Quick access to insights and wallet management.
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="h-9 w-9 rounded-full border border-wheat/15 flex items-center justify-center text-wheat/60"
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid gap-2">
                <Link
                  href="/insights"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-2xl border border-wheat/10 bg-wheat/5 px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-clay/15 text-clay flex items-center justify-center">
                      <Sparkles size={18} />
                    </span>
                    <div>
                      <p className="font-medium">Insights</p>
                      <p className="text-xs text-wheat/45">
                        Trends, totals, and quick views.
                      </p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/wallets"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-2xl border border-wheat/10 bg-wheat/5 px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-clay/15 text-clay flex items-center justify-center">
                      <Wallet size={18} />
                    </span>
                    <div>
                      <p className="font-medium">Wallets</p>
                      <p className="text-xs text-wheat/45">
                        Manage account types and currencies.
                      </p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/transfer"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-2xl border border-wheat/10 bg-wheat/5 px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-clay/15 text-clay flex items-center justify-center">
                      <ArrowLeftRight size={18} />
                    </span>
                    <div>
                      <p className="font-medium">Transfer</p>
                      <p className="text-xs text-wheat/45">
                        Move money between wallets.
                      </p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/planner"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-2xl border border-wheat/10 bg-wheat/5 px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-clay/15 text-clay flex items-center justify-center">
                      <CalendarClock size={18} />
                    </span>
                    <div>
                      <p className="font-medium">Planner</p>
                      <p className="text-xs text-wheat/45">
                        Budgets, goals, and recurring templates.
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
