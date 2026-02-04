// supabase/functions/telegram-webhook/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2"; // Supabase Edge Functions поддерживают npm: импорты [web:109]

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ALLOWED_CHAT_IDS_RAW = Deno.env.get("TELEGRAM_ALLOWED_CHAT_IDS") ?? "";
const ALLOWED_CHAT_IDS = new Set(
  ALLOWED_CHAT_IDS_RAW
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s)),
);

const DAYS_THRESHOLD = 90;
const WARNING_THRESHOLD = 75;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

function isToday(iso: string) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function daysSince(dateIso: string) {
  const now = new Date();
  const d = new Date(dateIso);
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

async function telegramSendMessage(chatId: number, text: string) {
  if (!BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is empty");
    return null;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      // parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!json?.ok) console.error("Telegram sendMessage error:", json);
  return json;
}

function normalize(s: string) {
  return (s || "").trim().toLowerCase();
}

// Надёжный парсер команды: берём bot_command из entities (если есть),
// иначе fallback на первое слово, и убираем @BotName. [web:215]
function getCommand(msg: any): { cmd: string; arg: string; text: string } {
  const text: string = (msg?.text ?? "").toString().trim();
  const entities = Array.isArray(msg?.entities) ? msg.entities : [];
  const ent = entities.find((e: any) => e?.type === "bot_command" && e?.offset === 0);

  let cmdRaw = "";
  if (ent && typeof ent.length === "number") {
    cmdRaw = text.slice(0, ent.length);
  } else {
    cmdRaw = (text.split(/\s+/)[0] ?? "");
  }

  const cmd = cmdRaw.split("@")[0].trim(); // /help@Bot -> /help
  const arg = text.slice(cmdRaw.length).trim();
  return { cmd, arg, text };
}

Deno.serve(async (req) => {
  // Проверка Telegram secret_token через заголовок X-Telegram-Bot-Api-Secret-Token,
  // который Telegram присылает, если вы установили webhook с secret_token. [web:163]
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (WEBHOOK_SECRET) {
    if (!secret || secret !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const update = await req.json().catch(() => null);
  console.log("UPDATE:", JSON.stringify(update));
console.log("SECRET_HDR:", req.headers.get("x-telegram-bot-api-secret-token"));


  // Обрабатываем обычные сообщения и отредактированные
  const msg = update?.message ?? update?.edited_message;
  if (!msg) return new Response("ok", { status: 200 });

  const chatId = msg?.chat?.id;
  if (!chatId) return new Response("ok", { status: 200 });

  const { cmd, arg, text } = getCommand(msg);

  // Если нет текста — просто подтверждаем доставку
  if (!text) return new Response("ok", { status: 200 });

  // Ограничение по chat_id (если задан список)
  if (ALLOWED_CHAT_IDS.size > 0 && !ALLOWED_CHAT_IDS.has(Number(chatId))) {
    await telegramSendMessage(Number(chatId), "⛔ Доступ запрещён.");
    return new Response("ok", { status: 200 });
  }

  const { data: employees, error } = await supabase
    .from("employees")
    .select("name, organization, training_date, created_at");

  if (error || !employees) {
    console.error("DB error:", error);
    await telegramSendMessage(Number(chatId), "❌ Ошибка доступа к базе данных.");
    return new Response("ok", { status: 200 });
  }

  const rows = employees
    .filter((e: any) => e?.training_date)
    .map((e: any) => {
      const days = daysSince(e.training_date);
      const expired = days >= DAYS_THRESHOLD;
      const warning = days >= WARNING_THRESHOLD && days < DAYS_THRESHOLD;
      const valid = !expired && !warning;

      return {
        name: e?.name ?? "—",
        organization: e?.organization ?? "—",
        created_at: e?.created_at ?? null,
        days,
        expired,
        warning,
        valid,
        overdueDays: expired ? Math.max(0, days - DAYS_THRESHOLD) : 0,
      };
    });

  const expiredCount = rows.filter((r: any) => r.expired).length;
  const warningCount = rows.filter((r: any) => r.warning).length;
  const validCount = rows.filter((r: any) => r.valid).length;
  const total = rows.length;

  // Команды
  if (cmd === "/help" || cmd === "help") {
    await telegramSendMessage(
      Number(chatId),
      [
        "*Команды:*",
        "/stats — сводка",
        "/new — новые сотрудники сегодня",
        "/expired 10 — топ просроченных (1..50)",
        "/org <название> — сводка по организации",
        "/id — показать chat_id (для настройки доступа)",
      ].join("\n"),
    );
    return new Response("ok", { status: 200 });
  }

  if (cmd === "/id") {
    await telegramSendMessage(Number(chatId), `Ваш chat_id: \`${chatId}\``);
    return new Response("ok", { status: 200 });
  }

  if (cmd === "/stats") {
    const cr = total ? ((validCount / total) * 100).toFixed(1) : "0.0";
    const overdueList = rows.filter((r: any) => r.expired).map((r: any) => r.overdueDays);
    const avgOverdue =
      overdueList.length === 0
        ? 0
        : overdueList.reduce((a: number, b: number) => a + b, 0) / overdueList.length;

    await telegramSendMessage(
      Number(chatId),
      [
        "*Отчёт по инструктажам*",
        `📈 Всего: ${total}`,
        `🟢 В норме: ${validCount} (${cr}%)`,
        `🟡 Предупреждение: ${warningCount}`,
        `🔴 Просрочено: ${expiredCount}`,
        `⏱ Средняя просрочка: ${avgOverdue.toFixed(1)} дн.`,
      ].join("\n"),
    );
    return new Response("ok", { status: 200 });
  }

  if (cmd === "/new") {
    const today = employees
      .filter((e: any) => e?.created_at && isToday(e.created_at))
      .map((e: any) => `• ${e?.name ?? "—"} — ${e?.organization ?? "—"}`);

    await telegramSendMessage(
      Number(chatId),
      ["*Новые сотрудники сегодня*", today.length ? today.slice(0, 40).join("\n") : "— нет"].join(
        "\n",
      ),
    );
    return new Response("ok", { status: 200 });
  }

  if (cmd === "/expired") {
    const limit = Math.min(Math.max(parseInt(arg || "10", 10) || 10, 1), 50);

    const list = rows
      .filter((r: any) => r.expired)
      .sort((a: any, b: any) => b.days - a.days)
      .slice(0, limit)
      .map((r: any) => `• ${r.name} — ${r.organization} (${r.days} дн.)`);

    await telegramSendMessage(
      Number(chatId),
      [`*Просроченные (топ ${limit})*`, list.length ? list.join("\n") : "— нет"].join("\n"),
    );
    return new Response("ok", { status: 200 });
  }

  if (cmd === "/org") {
    const q = normalize(arg);
    if (!q) {
      await telegramSendMessage(Number(chatId), "Напишите так: /org ПУТЕВИ");
      return new Response("ok", { status: 200 });
    }

    const orgRows = rows.filter((r: any) => normalize(r.organization).includes(q));
    const t = orgRows.length;
    const exp = orgRows.filter((r: any) => r.expired).length;
    const warn = orgRows.filter((r: any) => r.warning).length;
    const ok = orgRows.filter((r: any) => r.valid).length;
    const cr = t ? ((ok / t) * 100).toFixed(1) : "0.0";

    await telegramSendMessage(
      Number(chatId),
      [
        `*Организация:* ${arg}`,
        `📈 Всего: ${t}`,
        `🟢 В норме: ${ok} (${cr}%)`,
        `🟡 Предупреждение: ${warn}`,
        `🔴 Просрочено: ${exp}`,
      ].join("\n"),
    );
    return new Response("ok", { status: 200 });
  }

  await telegramSendMessage(Number(chatId), "Не понял команду. Напишите /help");
  return new Response("ok", { status: 200 });
});
