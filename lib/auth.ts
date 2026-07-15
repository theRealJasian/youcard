export const COOKIE_NAME = "youcard_auth";

// Runs in both the Node.js runtime (the login route) and the Edge runtime
// (middleware), so it only uses Web Crypto -- available in both.
async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getPin() {
  return process.env.YOUCARD_PIN || "275688";
}

// The cookie never stores the PIN itself -- it stores a hash of the PIN plus
// a secret, so middleware can confirm "this browser knows the PIN" without
// the cookie value being the PIN in plain text.
export async function expectedToken() {
  const secret = process.env.YOUCARD_PIN_SECRET || "youcard-default-secret";
  return sha256Hex(`${getPin()}:${secret}`);
}
