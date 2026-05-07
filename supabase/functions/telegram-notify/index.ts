import { createClient } from "npm:@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID   = Deno.env.get("TELEGRAM_CHAT_ID");
const SUPABASE_URL       = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY  = Deno.env.get("SUPABASE_ANON_KEY");
const ALLOWED_ORIGIN     = Deno.env.get("NOTIFY_ALLOWED_ORIGIN") ?? "";

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  throw new Error("[telegram-notify] TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set");
}
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("[telegram-notify] SUPABASE_URL and SUPABASE_ANON_KEY must be set");
}

// BUG FIX: "null" (string) blocked all browser requests. Fall back to "*" so the
// function works when NOTIFY_ALLOWED_ORIGIN is not set in Supabase secrets.
const corsHeaders = {
  "Access-Control-Allow-Origin":  ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_TIMEOUT_MS = 10_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Require authenticated session — supabase.functions.invoke() sends the JWT automatically
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ ok: false, description: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { error: authError } = await supabase.auth.getUser();
  if (authError) {
    return new Response(
      JSON.stringify({ ok: false, description: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.slice(0, 4096) : null;
    if (!text) {
      return new Response(
        JSON.stringify({ ok: false, description: "text field is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // BUG FIX: added AbortSignal.timeout to prevent hanging when Telegram API is slow.
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: "HTML",
        }),
        signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
      }
    );

    const data = await response.json();

    // Surface token/chat errors clearly without logging the token itself.
    if (!data?.ok) {
      console.error(
        `[telegram-notify] Telegram API error: code=${data?.error_code} description=${data?.description}`
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // BUG FIX: use "description" field (matches Telegram API convention) so the
    // frontend's data?.description fallback reads the real error message.
    const isTimeout = err instanceof DOMException && err.name === "TimeoutError";
    const description = isTimeout
      ? "Telegram API timeout — попробуйте позже"
      : "Internal server error";

    console.error("[telegram-notify] Catch:", isTimeout ? "timeout" : String(err));

    return new Response(
      JSON.stringify({ ok: false, description }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
