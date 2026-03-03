import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

// --- Вспомогательные функции ---

function isToday(iso: string) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function daysSince(dateIso: string) {
  const now = new Date();
  const d = new Date(dateIso);
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// Ультра-очистка для поиска
function superClean(str: string) {
  if (!str) return "";
  return str.toLowerCase()
    .replace(/["'«»„“]/g, '') // Убираем кавычки
    .replace(/[^а-яёa-z0-9]/g, '') // Только буквы и цифры
    .replace(/c/g, 'с').replace(/a/g, 'а').replace(/e/g, 'е').replace(/b/g, 'в').replace(/p/g, 'р').replace(/o/g, 'о'); // Латиница -> Кириллица
}
//Отправка текстового сообщения пользователю в телеграмм (Асинхронно)
async function telegramSendMessage(chatId: number, text: string) {
  if (!BOT_TOKEN) return null;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown", // Включаем поддержку разметки
      disable_web_page_preview: true,
    }),
  });
  return await res.json().catch(() => null);
}
// Получает входящее сообщение от пользователя, выделяет из него команды 
function getCommand(msg: any) {
  const text: string = (msg?.text ?? "").toString().trim();
  const entities = Array.isArray(msg?.entities) ? msg.entities : [];
  const ent = entities.find((e: any) => e?.type === "bot_command" && e?.offset === 0);
  let cmdRaw = ent ? text.slice(0, ent.length) : (text.split(/\s+/)[0] ?? "");
  const cmd = cmdRaw.split("@")[0].trim();
  const arg = text.slice(cmdRaw.length).trim();
  return { cmd, arg, text };
}

// --- Основной обработчик ---

Deno.serve(async (req) => {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) return new Response("Unauthorized", { status: 401 });

  const update = await req.json().catch(() => null);
  const msg = update?.message ?? update?.edited_message;
  if (!msg?.chat?.id) return new Response("ok", { status: 200 });

  const chatId = msg.chat.id;
  const { cmd, arg, text } = getCommand(msg);
  if (!text) return new Response("ok", { status: 200 });

  if (ALLOWED_CHAT_IDS.size > 0 && !ALLOWED_CHAT_IDS.has(Number(chatId))) {
    await telegramSendMessage(Number(chatId), "⛔ Доступ запрещён.");
    return new Response("ok", { status: 200 });
  }

  // Загружаем данные
  const { data: employees, error } = await supabase
    .from("employees")
    .select("name, organization, training_date, created_at");

  if (error || !employees) {
    await telegramSendMessage(Number(chatId), "❌ Ошибка БД.");
    return new Response("ok", { status: 200 });
  }

  const rows = employees
    .filter((e: any) => e?.training_date)
    .map((e: any) => {
      const days = daysSince(e.training_date);
      const expired = days >= DAYS_THRESHOLD;
      const warning = days >= WARNING_THRESHOLD && days < DAYS_THRESHOLD;
      return {
        name: e.name ?? "—",
        organization: e.organization ?? "—",
        created_at: e.created_at,
        days,
        expired,
        warning,
        valid: !expired && !warning
      };
    });

  // Логика команд
  if (cmd === "/help" || cmd === "help") {
    await telegramSendMessage(Number(chatId), 
      "*Команды:*\n/stats — общая сводка\n/org <имя> — по организации\n/expired — топ должников\n/new — добавленные сегодня\n/id — ваш ID"
    );
  }

  else if (cmd === "/id") {
    await telegramSendMessage(Number(chatId), `Ваш ID: \`${chatId}\``);
  }

  else if (cmd === "/stats") {
    const t = rows.length;
    const ok = rows.filter(r => r.valid).length;
    const wr = rows.filter(r => r.warning).length;
    const ex = rows.filter(r => r.expired).length;
    const cr = t ? ((ok / t) * 100).toFixed(1) : "0";
    await telegramSendMessage(Number(chatId), `*Отчёт:*\n📈 Всего: ${t}\n🟢 Норма: ${ok} (${cr}%)\n🟡 Скоро: ${wr}\n🔴 Просрочено: ${ex}`);
  }

  else if (cmd === "/org") {
    const q = superClean(arg);
    if (!q) {
      await telegramSendMessage(Number(chatId), "Напишите: `/org Эра` или `/org сб` ");
      return new Response("ok", { status: 200 });
    }

    const orgRows = rows.filter(r => superClean(r.organization).includes(q));

    if (orgRows.length === 0) {
      const allOrgs = Array.from(new Set(rows.map(r => r.organization)));
      const suggested = allOrgs.filter(o => superClean(o).includes(q.slice(0, 3))).slice(0, 5);
      let failMsg = `❌ Организация "${arg}" не найдена.`;
      if (suggested.length > 0) failMsg += `\n\nВозможно: \n• ${suggested.join('\n• ')}`;
      await telegramSendMessage(Number(chatId), failMsg);
      return new Response("ok", { status: 200 });
    }

    const t = orgRows.length;
    const ex = orgRows.filter(r => r.expired);
    const wr = orgRows.filter(r => r.warning).length;
    const ok = orgRows.filter(r => r.valid).length;
    const displayOrg = orgRows[0].organization;

    let report = [
      `🏢 *${displayOrg}*`,
      `━━━━━━━━━━━━━━`,
      `🟢 Норма: ${ok}`,
      `🟡 Внимание: ${wr}`,
      `🔴 Просрочено: ${ex.length}`,
      `━━━━━━━━━━━━━━`
    ].join("\n");

    if (ex.length > 0) {
      report += `\n*Критическая просрочка:*`;
      ex.sort((a,b) => b.days - a.days).slice(0, 5).forEach(e => {
        report += `\n• ${e.name} (${e.days} дн.)`;
      });
    }

    await telegramSendMessage(Number(chatId), report);
  }

  else if (cmd === "/new") {
    const today = employees.filter(e => e.created_at && isToday(e.created_at));
    const list = today.map(e => `• ${e.name} (${e.organization})`).join("\n");
    await telegramSendMessage(Number(chatId), `*Новые сегодня:*\n${list || "— нет"}`);
  }

  else if (cmd === "/expired") {
    const list = rows.filter(r => r.expired).sort((a,b) => b.days - a.days).slice(0, 15);
    const text = list.map(r => `• ${r.name} — ${r.organization} (*${r.days}* дн.)`).join("\n");
    await telegramSendMessage(Number(chatId), `*Топ просрочек:*\n${text || "— нет"}`);
  }

  return new Response("ok", { status: 200 });
});