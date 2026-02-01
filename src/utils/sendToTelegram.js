import { supabase } from "../supabaseClient";

/**
 * Отправляет текстовое сообщение в Telegram через Supabase Edge Function
 * @param {string} text - Текст сообщения для отправки
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function sendToTelegram(text) {
  try {
    const { data, error } = await supabase.functions.invoke("telegram-notify", {
      body: { text },
    });

    if (error) {
      console.error("❌ Ошибка Edge Function:", error);
      return {
        success: false,
        error: error.message || "Неизвестная ошибка Edge Function",
      };
    }

    if (data?.ok) {
      console.log("✅ Сообщение отправлено в Telegram");
      return { success: true, data };
    } else {
      console.error("❌ Telegram API вернул ошибку:", data);
      return {
        success: false,
        error: data?.description || "Ошибка отправки в Telegram",
      };
    }
  } catch (err) {
    console.error("❌ Критическая ошибка:", err);
    return {
      success: false,
      error: err.message || "Неизвестная ошибка сети",
    };
  }
}
