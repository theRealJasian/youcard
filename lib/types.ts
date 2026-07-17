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
  person_id: string | null;
  person_role: "for" | "from" | null;
  split_expense_id: string | null;
  transfer_account_id: string | null;
  receipt_path: string | null;
  receipt_url: string | null;
  created_at: string;
  // joined for convenience on the client
  account?: Account;
  transfer_account?: Account;
  person?: GiftPerson;
  split_expense?: SplitExpense;
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

export interface GiftPerson {
  id: string;
  name: string;
  email: string | null;
  relation: string | null;
  notes: string | null;
  created_at: string;
}

export interface GiftProduct {
  id: string;
  name: string;
  category: string;
  product_type: string | null;
  brand: string | null;
  notes: string | null;
  link: string | null;
  store: string | null;
  created_at: string;
  variants?: GiftProductVariant[];
  assignments?: GiftProductAssignment[];
}

export interface GiftProductVariant {
  id: string;
  product_id: string;
  name: string;
  variant_code: string | null;
  color: string | null;
  size: string | null;
  price: number | null;
  notes: string | null;
  created_at: string;
}

export interface GiftProductAssignment {
  id: string;
  product_id: string;
  variant_id: string | null;
  person_id: string;
  quantity: number;
  status: "idea" | "planned" | "ordered" | "wrapped" | "given";
  note: string | null;
  created_at: string;
  person?: GiftPerson;
  product?: GiftProduct;
  variant?: GiftProductVariant | null;
}

export interface SplitExpense {
  id: string;
  title: string;
  account_id: string;
  amount: number;
  note: string | null;
  split_type: "equal";
  transaction_id: string | null;
  created_at: string;
  account?: Account;
  shares?: SplitExpenseShare[];
}

export interface SplitExpenseShare {
  id: string;
  split_expense_id: string;
  person_id: string;
  share_amount: number;
  is_paid: boolean;
  note: string | null;
  created_at: string;
  person?: GiftPerson;
  split?: SplitExpense;
}

export interface GiftItem {
  id: string;
  person_id: string | null;
  title: string;
  category: string;
  product_type: string | null;
  variant: string | null;
  color: string | null;
  size: string | null;
  quantity: number;
  unit: string;
  status: "idea" | "planned" | "ordered" | "wrapped" | "given";
  occasion: string | null;
  price: number | null;
  store: string | null;
  link: string | null;
  note: string | null;
  created_at: string;
}

export interface SavedTemplate {
  id: string;
  scope: "transaction" | "gift" | "split";
  title: string;
  payload: Record<string, unknown>;
  created_at: string;
}
