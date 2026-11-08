// Makes the audio of a word with Azure and keeps it in Storage, where the app plays it from. Deployed with
// `supabase functions deploy pronounce --no-verify-jwt`: the session is checked here (see docs/integrations.md).
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  isPronounceable,
  PRONUNCIATION_BUCKET,
  pronunciationPath,
  pronunciationSsml,
  type Pronounced,
} from "../_shared/pronunciation.ts";

const CORS = { "Access-Control-Allow-Origin": "*" };

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function reply(status: number) {
  return new Response(null, { status, headers: CORS });
}

async function synthesize(pronounced: Pronounced): Promise<Blob> {
  const region = Deno.env.get("AZURE_SPEECH_REGION");
  const response = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": Deno.env.get("AZURE_SPEECH_KEY")!,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "zennia",
      },
      body: pronunciationSsml(pronounced),
    },
  );
  if (!response.ok) throw new Error(`Azure answered ${response.status}`);
  return await response.blob();
}

Deno.serve(async (req) => {
  // the preflight allows whatever headers the client asks for, as supabase-js adds its own over versions
  if (req.method === "OPTIONS")
    // a 204 can't have a body, not even an empty one
    return new Response(null, {
      status: 204,
      headers: {
        ...CORS,
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers":
          req.headers.get("Access-Control-Request-Headers") ?? "",
      },
    });

  const token = req.headers.get("Authorization")?.replace(/^Bearer /, "");
  const { data: user } = await db.auth.getUser(token);
  if (!user.user) return reply(401);

  const body = await req.json().catch(() => null);
  const pronounced: Pronounced = {
    written: String(body?.written ?? ""),
    reading: String(body?.reading ?? ""),
  };
  if (!isPronounceable(pronounced)) return reply(400);

  const bucket = db.storage.from(PRONUNCIATION_BUCKET);
  const path = await pronunciationPath(pronounced);
  const { data: existing } = await bucket.exists(path);
  if (existing) return reply(200);

  try {
    const audio = await synthesize(pronounced);
    const { error } = await bucket.upload(path, audio, {
      contentType: "audio/mpeg",
      upsert: true,
    });
    if (error) throw error;
  } catch (error) {
    console.error(error);
    return reply(502);
  }
  return reply(200);
});
