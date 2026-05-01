import { supabase } from "@/shared/api/supabase";
import { TOAST_MESSAGES, TOAST_TYPES, TOAST_DURATION } from "@/shared/constants/toast";
import { formatDataForApp, type AnyEmployee } from "@/features/employee-crud/api";

type Notify = (msg: string, type: string, duration?: number) => void;
type SetEmployees = (fn: (prev: AnyEmployee[]) => AnyEmployee[]) => void;

const FIELDS =
  "id,name,profession,birth_date,training_date,responsible,comment,photo_url,organization,additional_trainings,created_at";

export const retrainEmployee = async (
  id: unknown,
  notify: Notify,
  setEmployees: SetEmployees
): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  try {
    const { data, error } = await supabase
      .from("employees")
      .update({ training_date: today })
      .eq("id", id)
      .select(FIELDS)
      .single();
    if (error) throw error;
    const [mapped] = formatDataForApp([data]);
    setEmployees((prev) =>
      prev
        .map((emp) => (emp.id === mapped.id ? mapped : emp))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    notify(TOAST_MESSAGES.EMPLOYEE_RETRAINED, TOAST_TYPES.SUCCESS, TOAST_DURATION.NORMAL);
  } catch (e) {
    console.error("retrainEmployee error:", e);
    notify(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR);
  }
};
