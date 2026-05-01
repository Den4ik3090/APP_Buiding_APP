import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "[supabase] REACT_APP_SUPABASE_URL и REACT_APP_SUPABASE_KEY должны быть заданы в .env\n" +
    "Скопируйте .env.example → .env и заполните значения."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
