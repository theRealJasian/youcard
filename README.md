# YouCard

A personal ledger for the money your dad's card doesn't let you see. Track a
Card balance and Cash balance, each in whatever currencies you actually
carry (USD, THB, etc.), log every add/subtract with line items, and keep a
running transaction history — all from your phone.

Built from your wireframes:
- **Passcode lock** — every screen is gated behind a 6-digit PIN (default
  `275688`, change it via `YOUCARD_PIN`). Nothing loads until it's entered.
- **Home** — swipe between Card and Cash. Tap the big circle to page through
  the *actual, separately-tracked* balance you hold in each currency for
  that kind — it never does currency conversion or math, it just shows what
  you've logged in USD, THB, etc. Sub (–) and Add (+) buttons sit on either
  side and always apply to whichever currency is currently showing.
- **Recent transactions** — every add/subtract, newest first.
- **Transaction details** — line items, receipt photo, total.
- **Add / Subtract** — amount, itemized list, a placeholder "scan receipt"
  button you can wire up to OCR later.
- **Currencies** — add a new currency to Card or Cash, tap one to make it
  the default shown on Home.

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run everything in `supabase/schema.sql`. This
   creates the `accounts` and `transactions` tables, an `adjust_balance`
   function (so balances update atomically instead of racing), basic RLS
   policies, and seeds one Card (USD) and one Cash (THB) account so the
   home screen isn't empty on first load.
3. (Optional, for receipt photos) In **Storage**, create a bucket named
   `receipts` and mark it public.
4. In **Project Settings → API**, copy your **Project URL** and **anon
   public key**.

Read the RLS note at the bottom of `schema.sql` — the Supabase tables are
still wide open to anyone with your anon key (that's what the passcode
screen is for at the app level). Don't commit or share the anon key. If you
ever want the database itself locked down further, add Supabase Auth and
swap the policies to check `auth.uid()`.

## 2. Set your passcode

The app is gated behind a 6-digit PIN via `middleware.ts` — nothing renders
until it's entered, and it's remembered on that device for 30 days via an
httpOnly cookie (the PIN itself is never stored in the cookie, just a hash
of it).

- Default PIN: **275688**
- To change it, set `YOUCARD_PIN` in `.env.local` (and in Vercel's env vars
  once deployed) to whatever 6 digits you want.
- `YOUCARD_PIN_SECRET` is just salt for the cookie hash — set it to any
  random string, it doesn't need to be memorable.

Both are server-only env vars (no `NEXT_PUBLIC_` prefix), so they never end
up in the browser bundle.

## 3. Run it locally

```bash
npm install
cp .env.local.example .env.local
# then paste your Supabase URL + anon key into .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — resize your browser
to a phone width (or just open it on your phone once it's deployed) since
every screen is built for a ~390px-wide viewport.

## 4. Deploy to Vercel

```bash
npm i -g vercel   # if you don't have it yet
vercel
```

Or through the dashboard:
1. Push this folder to a GitHub repo.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Add all four env vars from `.env.local` under **Settings → Environment
   Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `YOUCARD_PIN`, `YOUCARD_PIN_SECRET`.
4. Deploy. Add it to your phone's home screen for an app-like feel (Safari:
   Share → Add to Home Screen).

## Project structure

```
middleware.ts               Redirects anyone without a valid session to /login
app/
  login/page.tsx             Passcode keypad
  api/login/route.ts         Checks the PIN, sets the session cookie
  api/logout/route.ts        Clears the session cookie
  page.tsx                   Home (swipeable Card/Cash)
  transactions/page.tsx       Recent transactions list
  transactions/[id]/page.tsx    Transaction detail
  add/page.tsx                 Add flow
  sub/page.tsx                 Subtract flow
  currencies/page.tsx          Manage currencies per account kind
components/
  BalanceCircle.tsx    The big tappable circle, pages through real per-currency balances
  TransactionForm.tsx  Shared add/subtract form (amount, items, finish)
  TransactionRow.tsx   One row in the transactions list
  BottomNav.tsx        Home / Transactions tab bar
lib/
  supabase.ts   Supabase client
  types.ts      Account / Transaction / LineItem types
  currency.ts   Formatting helpers (FX convert() is included but unused by default)
  auth.ts       Shared PIN-hashing helper used by the login route + middleware
supabase/
  schema.sql    Tables, RLS, adjust_balance() function, seed data
```

## Where to take it next

- **Receipt OCR**: `handleScanReceipt` in `TransactionForm.tsx` is a stub.
  Wire it to a Supabase Edge Function that calls an OCR API (Google Vision,
  or `tesseract.js` if you want it fully self-hosted) and have it return
  parsed `{ name, price }` items to prefill the form.
- **Live FX rates**: `lib/currency.ts` ships with fallback rates for the
  "preview in another currency" tap. `fetchLiveRates()` is there as a
  drop-in for a real API (e.g. `open.er-api.com`) — call it from a small
  cron'd route handler and cache the result in a `fx_rates` table so the
  client never needs its own API key.
- **Editing a transaction**: the detail page has a `Delete` button (it
  reverses the balance change first) but no edit form yet — that's the
  natural next screen if you want to fix a typo'd amount.
