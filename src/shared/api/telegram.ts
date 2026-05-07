import { supabase } from "./supabase";

export interface TelegramResult {
  success: boolean;
  error?: string;
}

/**
 * Отправляет текстовое сообщение в Telegram через Supabase Edge Function.
 * Никогда не логирует токены или секреты — только коды ошибок.
 */
export async function sendToTelegram(text: string): Promise<TelegramResult> {
  try {
    const { data, error } = await supabase.functions.invoke("telegram-notify", {
      body: { text },
    });

    if (error) {
      // FunctionsHttpError carries the HTTP status; surface it for diagnosis.
      const status = (error as { status?: number }).status;
      if (status === 401) {
        console.error("❌ Telegram: сессия не аутентифицирована (401). Войдите в систему.");
        return { success: false, error: "Необходима авторизация. Пожалуйста, войдите в систему." };
      }
      console.error("❌ Telegram Edge Function error:", status ?? "", error.message);
      return { success: false, error: error.message || "Неизвестная ошибка Edge Function" };
    }

    if (data?.ok) {
      return { success: true };
    }

    // Telegram API returned ok:false — surface the reason without logging it broadly.
    const description: string = data?.description || "Ошибка отправки в Telegram";
    console.error("❌ Telegram API error:", data?.error_code, description);
    return { success: false, error: description };
  } catch (err: unknown) {
    console.error("❌ Telegram: сетевая ошибка:", err instanceof Error ? err.message : err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Неизвестная ошибка сети",
    };
  }
}
