import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qbnzinnanaofjzgwwfjm.supabase.co";
const supabaseKey = "sb_publishable_sQjxHcAhcEARB8XdBbdP9w_2dA4SPK-";

export const supabase = createClient(supabaseUrl, supabaseKey);
