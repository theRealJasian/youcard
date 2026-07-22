"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Camera, X } from "lucide-react";
import {
  isSupabaseConfigured,
  supabase,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase";
import type { Account, GiftPerson, LineItem } from "@/lib/types";

type TransactionMode = "self" | "person" | "repayment" | "family";

const ADD_PRESETS = [
  {
    label: "Payback",
    merchant: "Friend",
    category: "repayment",
    note: "Someone paid me back",
  },
  {
    label: "Family",
    merchant: "Family",
    category: "family",
    note: "Money from parents or grandparents",
  },
  {
    label: "Refund",
    merchant: "Store",
    category: "refund",
    note: "Refund or reimbursement",
  },
] as const;

const SUB_PRESETS = [
  {
    label: "Coffee",
    merchant: "Coffee shop",
    category: "food",
    note: "Coffee or a small treat",
  },
  {
    label: "Snacks",
    merchant: "Snack run",
    category: "food",
    note: "Shared snacks or drinks",
  },
  {
    label: "Gift",
    merchant: "Gift shop",
    category: "gifts",
    note: "Something for a friend",
  },
  {
    label: "Split",
    merchant: "Shared expense",
    category: "split",
    note: "Shared with a friend",
  },
] as const;

export default function TransactionForm({
  accountId,
  kind,
  mode,
}: {
  accountId: string;
  kind: "add" | "sub";
  mode?: TransactionMode;
}) {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [people, setPeople] = useState<GiftPerson[]>([]);
  const [amount, setAmount] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [personId, setPersonId] = useState("");
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!isSupabaseConfigured) {
        if (active) setLoading(false);
        return;
      }

      const [accountRes, peopleRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("*")
          .eq("id", accountId)
          .single(),
        supabase.from("gift_people").select("*").order("name", { ascending: true }),
      ]);

      if (!active) return;
      if (accountRes.error) console.warn(accountRes.error);
      if (peopleRes.error) console.warn(peopleRes.error);
      setAccount((accountRes.data as Account | null) ?? null);
      setPeople((peopleRes.data as GiftPerson[] | null) ?? []);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [accountId]);

  const itemTotal = items.reduce((sum, it) => sum + (it.price || 0), 0);

  function addItem() {
    setItems([...items, { name: "", price: 0 }]);
  }

  function updateItem(i: number, field: keyof LineItem, value: string) {
    setItems(
      items.map((it, idx) =>
        idx === i
          ? { ...it, [field]: field === "price" ? Number(value) || 0 : value }
          : it
      )
    );
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  function handleScanReceipt() {
    if (!isSupabaseConfigured) {
      alert("Supabase is not configured yet.");
      return;
    }
    fileInputRef.current?.click();
  }

  async function scanReceiptFile(file: File) {
    if (!isSupabaseConfigured) {
      alert("Supabase is not configured yet.");
      return;
    }

    setScanning(true);

    try {
      const extension = file.name.split(".").pop() || "jpg";
      const filePath = `receipt-${crypto.randomUUID()}.${extension}`;
      const previewUrl = URL.createObjectURL(file);

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(filePath, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("receipts")
        .createSignedUrl(filePath, 60 * 10);

      if (signedUrlError) {
        throw signedUrlError;
      }

      const functionUrl = `${supabaseUrl}/functions/v1/ocr-receipt`;
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey ?? "",
          Authorization: `Bearer ${supabaseAnonKey ?? ""}`,
        },
        body: JSON.stringify({ imageUrl: signedUrlData.signedUrl }),
      });

      const responseText = await response.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        data = { raw: responseText };
      }

      if (!response.ok) {
        throw new Error(
          data?.error
            ? `${data.error}${data.detail ? `: ${data.detail}` : ""}`
            : `Edge Function returned ${response.status}`
        );
      }

      const parsedItems = Array.isArray(data?.items)
        ? data.items
            .filter((item: { name?: string; price?: number }) => item?.name || item?.price)
            .map((item: { name?: string; price?: number }) => ({
              name: String(item.name ?? ""),
              price: Number(item.price ?? 0),
            }))
        : [];

      if (parsedItems.length > 0) {
        setItems(parsedItems);
      }

      if (typeof data?.merchant === "string" && data.merchant.trim()) {
        setMerchant(data.merchant.trim());
      }

      const nextAmount = Number(data?.total);
      if (Number.isFinite(nextAmount) && nextAmount > 0) {
        setAmount(String(nextAmount));
      } else if (parsedItems.length > 0) {
        setAmount(
          String(
            parsedItems.reduce(
              (sum: number, item: { name: string; price: number }) =>
                sum + (item.price || 0),
              0
            )
          )
        );
      }

      if (typeof data?.category === "string" && data.category.trim()) {
        setCategory(data.category.trim());
      }

      if (typeof data?.note === "string" && data.note.trim()) {
        setNote(data.note.trim());
      }

      setReceiptPath(filePath);
      setReceiptPreviewUrl(previewUrl);
      setShowPreview(true);
    } catch (error) {
      console.warn(error);
      alert(
        error instanceof Error
          ? `Could not scan that receipt: ${error.message}`
          : "Could not scan that receipt. You can still fill it in manually."
      );
    } finally {
      setScanning(false);
    }
  }

  function handleClose() {
    router.push("/");
  }

  const personMode =
    (kind === "sub" && mode === "person") ||
    (kind === "add" && (mode === "repayment" || mode === "family"));
  const personPrompt =
    kind === "sub"
      ? "Who was this for?"
      : mode === "repayment"
      ? "Who paid you back?"
      : "Who sent the money?";
  const personHelper =
    kind === "sub"
      ? "Track how much you spend on each person."
      : mode === "repayment"
      ? "Use this for money someone is paying back."
      : "Use this for money from parents, grandparents, or anyone else.";
  const presets = kind === "sub" ? SUB_PRESETS : ADD_PRESETS;

  function applyPreset(
    preset: (typeof SUB_PRESETS)[number] | (typeof ADD_PRESETS)[number]
  ) {
    setMerchant(preset.merchant);
    setCategory(preset.category);
    setNote(preset.note);
  }

  async function handleFinish() {
    if (!account) return;
    const finalAmount = Number(amount) || itemTotal;
    if (finalAmount <= 0) return;
    if (personMode && !personId) return;
    setSaving(true);

    const { data: insertedTx, error: txError } = await supabase
      .from("transactions")
      .insert({
        account_id: account.id,
        kind,
        amount: finalAmount,
        items: items.filter((it) => it.name || it.price),
        merchant: merchant.trim() || null,
        note: note || null,
        category: category.trim() || null,
        person_id: personMode ? personId : null,
        person_role:
          kind === "sub"
            ? personMode
              ? "for"
              : null
            : personMode
            ? "from"
            : null,
        receipt_path: receiptPath,
      })
      .select("id")
      .single();

    if (txError) {
      console.warn(txError);
      setSaving(false);
      return;
    }

    const delta = kind === "add" ? finalAmount : -finalAmount;
    const { error: balError } = await supabase.rpc("adjust_balance", {
      p_account_id: account.id,
      p_delta: delta,
    });
    if (balError) console.warn(balError);

    setSaving(false);
    const insertedId = (insertedTx as { id?: string } | null)?.id;
    router.push(
      personMode && insertedId ? `/transactions/${insertedId}` : "/"
    );
  }

  if (!account) {
    if (!loading) {
      return (
        <div className="relative text-center py-10">
          <button
            onClick={handleClose}
            aria-label="Close"
            className="absolute right-0 top-0 h-9 w-9 rounded-full border border-wheat/20 flex items-center justify-center text-wheat/70 active:scale-95 transition"
          >
            <X size={16} />
          </button>
          <p className="text-wheat/60 mb-2">
            {isSupabaseConfigured
              ? "That account was not found."
              : "Supabase is not configured yet, so this form is just a blank shell."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="text-clay underline underline-offset-4"
          >
            Back to home
          </button>
        </div>
      );
    }

    return (
      <div className="relative py-10">
        <button
          onClick={handleClose}
          aria-label="Close"
          className="absolute right-0 top-0 h-9 w-9 rounded-full border border-wheat/20 flex items-center justify-center text-wheat/70 active:scale-95 transition"
        >
          <X size={16} />
        </button>
        <p className="text-wheat/40 text-sm py-8 text-center">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col mt-2">
      <button
        onClick={handleClose}
        aria-label="Close"
        className="absolute right-0 top-0 h-9 w-9 rounded-full border border-wheat/20 flex items-center justify-center text-wheat/70 active:scale-95 transition"
      >
        <X size={16} />
      </button>
      <p className="uppercase tracking-[0.3em] text-xs text-wheat/40 text-center">
        {kind === "add" ? "Add" : "Subtract"} · {account.kind}
      </p>

      <div className="text-center mt-4 mb-6">
        <p className="font-mono text-2xl tabular-nums">
          {account.balance.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </p>
        <p className="text-wheat/50 text-sm mt-0.5">{account.currency}</p>
      </div>

      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-wheat/40 mb-2">
          Quick presets
        </p>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className="rounded-full border border-wheat/15 px-3 py-1.5 text-xs text-wheat/60"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {personMode ? (
        <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4 mb-5">
          <label className="text-xs uppercase tracking-wide text-wheat/40 mb-1 block">
            {personPrompt}
          </label>
          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            className="w-full bg-transparent border-b border-wheat/20 py-2 outline-none focus:border-clay"
          >
            <option value="">Select a person</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
                {person.relation ? ` · ${person.relation}` : ""}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-wheat/45">{personHelper}</p>
          {people.length === 0 ? (
            <p className="mt-2 text-xs text-wheat/45">
              No people yet.{" "}
              <Link href="/gifts" className="text-clay underline underline-offset-4">
                Add one in Gifts
              </Link>
              .
            </p>
          ) : null}
        </div>
      ) : null}

      <label className="text-xs uppercase tracking-wide text-wheat/40 mb-1">
        Amount
      </label>
      <input
        inputMode="decimal"
        placeholder="0.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="bg-transparent border-b border-wheat/30 text-2xl font-mono py-2 mb-6 focus:border-clay outline-none"
      />

      <div className="flex items-center justify-between mb-2">
        <label className="text-xs uppercase tracking-wide text-wheat/40">
          Item(s)
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleScanReceipt}
            aria-label="Scan receipt"
            className="h-8 w-8 rounded-full border border-wheat/30 flex items-center justify-center text-wheat/70 disabled:opacity-50"
            disabled={scanning}
          >
            <Camera size={15} />
          </button>
          <button
            onClick={addItem}
            aria-label="Add item"
            className="h-8 w-8 rounded-full border border-wheat/30 flex items-center justify-center text-wheat/70"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="flex-1">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 py-2">
            <input
              placeholder="Item name"
              value={it.name}
              onChange={(e) => updateItem(i, "name", e.target.value)}
              className="flex-1 bg-transparent border-b border-wheat/15 py-1 outline-none focus:border-clay"
            />
            <input
              inputMode="decimal"
              placeholder="0.00"
              value={it.price || ""}
              onChange={(e) => updateItem(i, "price", e.target.value)}
              className="w-20 bg-transparent border-b border-wheat/15 py-1 font-mono text-right outline-none focus:border-clay"
            />
            <button
              onClick={() => removeItem(i)}
              aria-label="Remove item"
              className="text-wheat/30"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <div className="w-full max-w-[480px] rounded-3xl border border-wheat/10 bg-[#151812] p-5 shadow-2xl">
            <div className="mb-4">
              <p className="font-display text-xl">Preview receipt</p>
              <p className="text-xs text-wheat/45 mt-1">
                Check the scan before saving it.
              </p>
            </div>

            {receiptPreviewUrl && (
              <div className="mb-4 overflow-hidden rounded-2xl border border-wheat/10">
                <img
                  src={receiptPreviewUrl}
                  alt="Receipt preview"
                  className="h-56 w-full object-cover"
                />
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 border-b border-wheat/10 pb-2">
                <span className="text-wheat/45">Merchant</span>
                <span className="text-wheat/85 text-right">
                  {merchant || "Not detected"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-wheat/10 pb-2">
                <span className="text-wheat/45">Total</span>
                <span className="font-mono text-wheat/85">
                  {amount || "0.00"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-wheat/10 pb-2">
                <span className="text-wheat/45">Category</span>
                <span className="text-wheat/85">{category || "Not set"}</span>
              </div>
            </div>

            {items.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.24em] text-wheat/40 mb-2">
                  Items
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {items.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-wheat/80">
                        {item.name || `Item ${index + 1}`}
                      </span>
                      <span className="font-mono text-wheat/70">
                        {Number(item.price || 0).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setShowPreview(false);
                  handleScanReceipt();
                }}
                className="flex-1 rounded-full border border-wheat/20 py-3 text-wheat/60"
              >
                Scan again
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 rounded-full bg-clay text-ink font-medium py-3"
              >
                Use receipt
              </button>
            </div>
          </div>
        </div>
      )}

      <label className="text-xs uppercase tracking-wide text-wheat/40 mt-3 mb-1">
        Merchant
      </label>
      <input
        placeholder="Merchant name"
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
        className="bg-transparent border-b border-wheat/15 py-2 outline-none focus:border-clay mb-5"
      />

      <label className="text-xs uppercase tracking-wide text-wheat/40 mt-3 mb-1">
        Category
      </label>
      <input
        placeholder="Food, transport, bills..."
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="bg-transparent border-b border-wheat/15 py-2 outline-none focus:border-clay mb-5"
      />

      <label className="text-xs uppercase tracking-wide text-wheat/40 mb-1">
        Note
      </label>
      <input
        placeholder="Optional note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="bg-transparent border-b border-wheat/15 py-2 outline-none focus:border-clay"
      />

        <button
          onClick={handleFinish}
          disabled={saving || scanning || (personMode && !personId)}
          aria-busy={saving || scanning}
          className="mt-6 w-full rounded-full bg-clay text-ink font-medium py-3.5 disabled:opacity-50"
        >
          {saving ? "Saving…" : scanning ? "Scanning…" : "Finish"}
        </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          void scanReceiptFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
