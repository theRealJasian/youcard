export type AccountKind = string;

export interface Account {
  id: string;
  kind: AccountKind;
  currency: string; // ISO 4217 code, e.g. "USD", "THB"
  balance: number;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface LineItem {
  name: string;
  price: number;
}

export interface Transaction {
  id: string;
  account_id: string;
  kind: "add" | "sub" | "transfer";
  amount: number; // always positive; sign is implied by kind
  items: LineItem[] | null;
  merchant: string | null;
  note: string | null;
  category: string | null;
  transfer_account_id: string | null;
  receipt_path: string | null;
  receipt_url: string | null;
  created_at: string;
  // joined for convenience on the client
  account?: Account;
  transfer_account?: Account;
}

export interface Budget {
  id: string;
  name: string;
  category: string;
  amount: number;
  period: string;
  active: boolean;
  created_at: string;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  wallet_kind: string | null;
  active: boolean;
  created_at: string;
}

export interface RecurringRule {
  id: string;
  title: string;
  kind: "add" | "sub" | "transfer";
  account_id: string;
  transfer_account_id: string | null;
  amount: number;
  category: string | null;
  note: string | null;
  cadence: string;
  next_run_at: string | null;
  active: boolean;
  created_at: string;
}
