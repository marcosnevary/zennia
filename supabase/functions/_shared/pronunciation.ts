// Shared by the app and the `pronounce` Edge Function, which runs on Deno: no imports, and only web APIs.

/** What is read aloud: the word as written, said with its reading. */
export interface Pronounced {
  written: string;
  /** In hiragana; the voice says this, whatever its own reading of the written form. */
  reading: string;
}

export const PRONUNCIATION_BUCKET = "pronunciations";

export const PRONUNCIATION_VOICE = "ja-JP-NanamiNeural";

const MAX_LENGTH = 32;
const KANA = /^[ぁ-ゖァ-ヺー]+$/;

/** Whether the Edge Function accepts it: anyone with a session can call it, so it only takes what a word can be. */
export function isPronounceable({ written, reading }: Pronounced): boolean {
  return (
    written.length > 0 &&
    written.length <= MAX_LENGTH &&
    reading.length <= MAX_LENGTH &&
    KANA.test(reading)
  );
}

/** Where the audio is kept in the bucket. The voice is part of the path, so a new voice never plays an old file. */
export async function pronunciationPath({
  written,
  reading,
}: Pronounced): Promise<string> {
  const bytes = new TextEncoder().encode(`${written}\n${reading}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hex = Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${PRONUNCIATION_VOICE}/${hex}.mp3`;
}

function toKatakana(hiragana: string): string {
  return hiragana.replace(/[ぁ-ゖ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) + 0x60),
  );
}

function escapeXml(text: string): string {
  return text.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}

/**
 * The SSML sent to Azure. The phoneme makes the voice say the saved reading, and leaving out accent marks lets the
 * voice give the word its own pitch accent, which it gets right where the marks don't (see docs/practice.md).
 */
export function pronunciationSsml({ written, reading }: Pronounced): string {
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">` +
    `<voice name="${PRONUNCIATION_VOICE}">` +
    `<phoneme alphabet="sapi" ph="${toKatakana(reading)}">${escapeXml(written)}</phoneme>` +
    `</voice></speak>`
  );
}
