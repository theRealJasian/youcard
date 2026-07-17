"use client";

import { useState } from "react";
import { Download, Mail, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatAmount } from "@/lib/currency";
import type { Transaction } from "@/lib/types";

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(/\s+/);
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, currentY);
  }

  return currentY + lineHeight;
}

function buildBody(tx: Transaction) {
  const personName = tx.person?.name ?? "Someone";
  const role = tx.person_role === "for" ? "for" : "from";
  const verb =
    tx.kind === "sub"
      ? `You paid ${personName}`
      : `You received money ${role} ${personName}`;
  const date = new Date(tx.created_at).toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    title: tx.kind === "sub" ? "Digital receipt" : "Payment received",
    headline: verb,
    date,
  };
}

export default function DigitalReceiptShare({ tx }: { tx: Transaction }) {
  const [saving, setSaving] = useState(false);
  const canShareFile = typeof navigator !== "undefined" && "share" in navigator;
  const enabled = Boolean(tx.person);

  async function makeBlob() {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas is not supported in this browser.");
    }

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#12140f");
    gradient.addColorStop(0.5, "#171b13");
    gradient.addColorStop(1, "#23261c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(200, 98, 45, 0.18)";
    ctx.beginPath();
    ctx.arc(980, 220, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(246, 244, 236, 0.05)";
    ctx.beginPath();
    ctx.arc(210, 1220, 260, 0, Math.PI * 2);
    ctx.fill();

    const cardX = 90;
    const cardY = 110;
    const cardW = 1020;
    const cardH = 1380;
    const radius = 44;

    ctx.save();
    ctx.fillStyle = "#181b14";
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    ctx.beginPath();
    ctx.moveTo(cardX + radius, cardY);
    ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + cardH, radius);
    ctx.arcTo(cardX + cardW, cardY + cardH, cardX, cardY + cardH, radius);
    ctx.arcTo(cardX, cardY + cardH, cardX, cardY, radius);
    ctx.arcTo(cardX, cardY, cardX + cardW, cardY, radius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "rgba(246, 244, 236, 0.06)";
    ctx.fillRect(cardX, cardY, cardW, 1);

    const body = buildBody(tx);
    const personName = tx.person?.name ?? "Someone";
    const relation = tx.person?.relation ?? "Friend";
    const currency = tx.account?.currency ?? "";
    const amount = formatAmount(tx.amount);
    const totalLine =
      tx.kind === "sub"
        ? `You paid ${amount} ${currency} from ${tx.account?.kind ?? "wallet"}`
        : `You received ${amount} ${currency} into ${tx.account?.kind ?? "wallet"}`;

    ctx.fillStyle = "#f6f4ec";
    ctx.font = "700 64px Fraunces, serif";
    ctx.fillText(body.title, cardX + 60, cardY + 120);

    ctx.fillStyle = "#c8622d";
    ctx.font = "600 26px Inter, sans-serif";
    ctx.fillText("YOUCARD", cardX + 60, cardY + 180);

    ctx.fillStyle = "#f6f4ec";
    ctx.font = "700 58px Fraunces, serif";
    let y = wrapText(ctx, body.headline, cardX + 60, cardY + 290, cardW - 120, 72);

    ctx.fillStyle = "rgba(246, 244, 236, 0.62)";
    ctx.font = "500 28px Inter, sans-serif";
    y = wrapText(
      ctx,
      `${personName}${relation ? ` · ${relation}` : ""}`,
      cardX + 60,
      y + 20,
      cardW - 120,
      38
    );

    ctx.fillStyle = "#f6f4ec";
    ctx.font = "700 82px IBM Plex Mono, monospace";
    ctx.fillText(amount, cardX + 60, y + 110);

    ctx.fillStyle = "rgba(246, 244, 236, 0.7)";
    ctx.font = "500 28px Inter, sans-serif";
    ctx.fillText(currency, cardX + 430, y + 110);

    ctx.fillStyle = "rgba(246, 244, 236, 0.72)";
    ctx.font = "500 30px Inter, sans-serif";
    y += 180;
    y = wrapText(ctx, totalLine, cardX + 60, y, cardW - 120, 42);

    ctx.fillStyle = "rgba(246, 244, 236, 0.45)";
    ctx.font = "500 24px Inter, sans-serif";
    ctx.fillText(`Date: ${body.date}`, cardX + 60, y + 40);

    if (tx.category) {
      ctx.fillText(`Category: ${tx.category}`, cardX + 60, y + 80);
    }

    if (tx.note) {
      y = wrapText(
        ctx,
        `Note: ${tx.note}`,
        cardX + 60,
        y + 130,
        cardW - 120,
        34
      );
    } else {
      y += 130;
    }

    ctx.fillStyle = "rgba(200, 98, 45, 0.2)";
    ctx.fillRect(cardX + 60, cardY + cardH - 270, cardW - 120, 1);
    ctx.fillStyle = "rgba(246, 244, 236, 0.55)";
    ctx.font = "500 22px Inter, sans-serif";
    ctx.fillText(
      "Tap share or save this receipt to send it by email, message, or image.",
      cardX + 60,
      cardY + cardH - 210
    );

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not generate the receipt image."));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  }

  async function downloadReceipt() {
    try {
      setSaving(true);
      const blob = await makeBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `youcard-receipt-${tx.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setSaving(false);
    }
  }

  async function shareReceipt() {
    try {
      setSaving(true);
      const blob = await makeBlob();
      const file = new File([blob], `youcard-receipt-${tx.id}.png`, {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "YouCard receipt",
          text: "Here is the receipt",
          files: [file],
        });
      } else {
        await downloadReceipt();
      }
    } finally {
      setSaving(false);
    }
  }

  function emailReceipt() {
    const person = tx.person;
    const recipient = person?.email ?? "";
    const subject = encodeURIComponent(
      tx.kind === "sub"
        ? `Payback for ${person?.name ?? "you"}`
        : `Receipt from ${person?.name ?? "YouCard"}`
    );
    const body = encodeURIComponent(
      `Hi ${person?.name ?? ""},\n\nHere is the receipt from YouCard.\n\nAmount: ${formatAmount(
        tx.amount
      )} ${tx.account?.currency ?? ""}\nDate: ${new Date(tx.created_at).toLocaleDateString(
        "en-GB"
      )}\n${tx.note ? `Note: ${tx.note}\n` : ""}\nYou can also ask me for the image version if needed.`
    );

    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  }

  if (!enabled) return null;

  return (
    <section className="mt-6 rounded-[28px] border border-wheat/10 bg-[#171a13] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl">Digital receipt</p>
          <p className="text-xs text-wheat/45 mt-1">
            Save as a photo, share it directly, or open an email draft.
          </p>
        </div>
        <motion.div
          className="h-10 w-10 rounded-full bg-clay/15 text-clay flex items-center justify-center"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Share2 size={18} />
        </motion.div>
      </div>

      <div className="mt-4 rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
          Preview
        </p>
        <p className="mt-2 text-lg font-medium">
          {tx.kind === "sub"
            ? `You paid ${tx.person?.name ?? "someone"}`
            : `Money from ${tx.person?.name ?? "someone"}`}
        </p>
        <p className="text-sm text-wheat/45 mt-1">
          {tx.person_role === "for"
            ? "Use this when a friend should pay you back."
            : "Use this when you got money from family or a friend."}
        </p>
        <p className="mt-4 font-mono text-2xl tabular-nums">
          {formatAmount(tx.amount)} {tx.account?.currency ?? ""}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          onClick={downloadReceipt}
          disabled={saving}
          className="rounded-2xl border border-wheat/15 px-3 py-3 text-xs flex items-center justify-center gap-2 text-wheat/75 disabled:opacity-50"
        >
          <Download size={14} />
          Photo
        </button>
        <button
          onClick={shareReceipt}
          disabled={saving}
          className="rounded-2xl border border-wheat/15 px-3 py-3 text-xs flex items-center justify-center gap-2 text-wheat/75 disabled:opacity-50"
        >
          <Share2 size={14} />
          Share
        </button>
        <button
          onClick={emailReceipt}
          className="rounded-2xl border border-wheat/15 px-3 py-3 text-xs flex items-center justify-center gap-2 text-wheat/75"
        >
          <Mail size={14} />
          Email
        </button>
      </div>

      <p className="mt-3 text-xs text-wheat/40">
        If the person has an email saved, the email button opens a draft to that address.
        Otherwise, share or download the image and send it however you like.
      </p>
    </section>
  );
}
