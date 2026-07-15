import Link from "next/link";
import { formatAmount } from "@/lib/currency";
import type { Transaction } from "@/lib/types";

export default function TransactionRow({ tx }: { tx: Transaction }) {
  const date = new Date(tx.created_at);
  const dateLabel = date.toLocaleDateString("en-GB"); // DD.MM.YYYY
  const timeLabel = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const isAdd = tx.kind === "add";
  const isTransfer = tx.kind === "transfer";
  const currency = tx.account?.currency ?? "";
  const itemCount = tx.items?.length ?? 0;
  const transferCurrency = tx.transfer_account?.currency ?? "";
  const transferLabel =
    isTransfer && tx.transfer_account
      ? `${tx.account?.kind === "card" ? "Card" : "Cash"} → ${
          tx.transfer_account?.kind === "card" ? "Card" : "Cash"
        }`
      : "";

  return (
    <Link
      href={`/transactions/${tx.id}`}
      className="flex items-center justify-between py-3 border-b border-wheat/10"
    >
      <div className="flex flex-col">
        <span className="text-xs text-wheat/50">{dateLabel}</span>
        <span className="text-sm text-wheat/70">
          {timeLabel} ·{" "}
          {isTransfer
            ? transferLabel
            : tx.account?.kind === "card"
            ? "Card"
            : "Cash"}
          {itemCount > 0 ? ` · ${itemCount} item${itemCount > 1 ? "s" : ""}` : ""}
          {tx.merchant ? ` · ${tx.merchant}` : ""}
          {tx.category ? ` · ${tx.category}` : ""}
        </span>
      </div>
      <span
        className={`font-mono tabular-nums ${
          isTransfer ? "text-clay" : isAdd ? "text-good" : "text-bad"
        }`}
      >
        {isTransfer ? "↔" : isAdd ? "+" : "-"}
        {formatAmount(tx.amount)} {isTransfer ? transferCurrency || currency : currency}
      </span>
    </Link>
  );
}
