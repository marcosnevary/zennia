/** A Google ID token and the raw nonce it was issued for, which Supabase checks against its hash in the token. */
export interface GoogleToken {
  token: string;
  nonce: string;
}

export class PopupBlockedError extends Error {}

/** The page Google sends the popup back to; it broadcasts the hash on this channel and closes. */
const CALLBACK = "/auth/google.html";
const CHANNEL = "google-sign-in";

let pending: BroadcastChannel | undefined;

/**
 * Asks Google for an ID token in a popup, so the page stays and the same token can both link and sign in.
 * Resolves to null when the user declines, and never resolves if they close the popup.
 */
export async function requestGoogleToken(): Promise<GoogleToken | null> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "Google sign-in is not configured: set VITE_GOOGLE_CLIENT_ID in .env.",
    );
  }
  const nonce = crypto.randomUUID();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: window.location.origin + CALLBACK,
    response_type: "id_token",
    scope: "openid email profile",
    nonce: await sha256(nonce),
  }).toString();

  // Google's pages cut the popup off from its opener, so the answer comes over a channel instead of window.opener
  pending?.close();
  const channel = new BroadcastChannel(CHANNEL);
  pending = channel;
  const answer = new Promise<string>((resolve) => {
    channel.onmessage = (event) => resolve(event.data);
  });
  if (!window.open(url, "google-sign-in", "popup,width=480,height=640")) {
    channel.close();
    throw new PopupBlockedError();
  }
  const token = new URLSearchParams(await answer).get("id_token");
  channel.close();
  return token ? { token, nonce } : null;
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
