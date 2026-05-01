import { supabase } from "@/shared/api/supabase";
import { TOAST_MESSAGES, TOAST_TYPES, TOAST_DURATION } from "@/shared/constants/toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEmployee = Record<string, any>;
type Notify = (msg: string, type: string, duration?: number) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SetEmployees = (fn: (prev: AnyEmployee[]) => AnyEmployee[]) => void;

const FIELDS =
  "id,name,profession,birth_date,training_date,responsible,comment,photo_url,organization,additional_trainings,created_at";

export const getDaysDifference = (date: string): number =>
  Math.floor((Date.now() - new Date(date).getTime()) / 86400000);

export const mapFormToDb = (form: AnyEmployee) => ({
  name: form.name,
  profession: form.profession,
  birth_date: form.birthDate || null,
  training_date: form.trainingDate,
  responsible: form.responsible || null,
  comment: form.comment || null,
  photo_url: form.photo_url || null,
  organization: form.organization || null,
  additional_trainings: form.additionalTrainings || [],
});

export const formatDataForApp = (data: AnyEmployee[]): AnyEmployee[] =>
  data.map((emp) => ({
    id: emp.id,
    name: emp.name,
    profession: emp.profession,
    birthDate: emp.birth_date,
    trainingDate: emp.training_date,
    responsible: emp.responsible || "",
    comment: emp.comment || "",
    photo_url: emp.photo_url || "",
    organization: emp.organization || "",
    additionalTrainings: emp.additional_trainings || [],
    createdAt: emp.created_at || null,
  }));

export const fetchFromSupabase = async (): Promise<AnyEmployee[]> => {
  const { data, error } = await supabase
    .from("employees")
    .select(FIELDS)
    .order("name", { ascending: true });
  if (error) throw error;
  return formatDataForApp(data);
};

export const fetchOrganizations = async (): Promise<string[]> => {
  const { data, error } = await supabase.from("employees").select("organization");
  if (error || !data) return [];
  const unique = [...new Set(data.map((i: AnyEmployee) => i.organization).filter(Boolean))];
  return (unique as string[]).sort();
};

export const addEmployee = async (
  formData: AnyEmployee,
  notify: Notify,
  setEmployees: SetEmployees,
  setShowForm: (v: boolean) => void,
  setEditingEmployee: (v: AnyEmployee | null) => void
): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from("employees")
      .insert([mapFormToDb(formData)])
      .select()
      .single();
    if (error) throw error;
    const mapped = formatDataForApp([data])[0];
    setEmployees((prev) => [...prev, mapped].sort((a, b) => a.name.localeCompare(b.name)));
    notify(TOAST_MESSAGES.EMPLOYEE_ADDED, TOAST_TYPES.SUCCESS, TOAST_DURATION.LONG);
    setShowForm(false);
    setEditingEmployee(null);
  } catch (e) {
    console.error("addEmployee error:", e);
    notify(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR);
  }
};

export const updateEmployee = async (
  formData: AnyEmployee,
  notify: Notify,
  setEmployees: SetEmployees,
  setShowForm: (v: boolean) => void,
  setEditingEmployee: (v: AnyEmployee | null) => void
): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from("employees")
      .update(mapFormToDb(formData))
      .eq("id", formData.id)
      .select(FIELDS)
      .single();
    if (error) throw error;
    const [mapped] = formatDataForApp([data]);
    setEmployees((prev) =>
      prev
        .map((emp) => (emp.id === mapped.id ? mapped : emp))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    notify(TOAST_MESSAGES.EMPLOYEE_UPDATED, TOAST_TYPES.SUCCESS, TOAST_DURATION.NORMAL);
    setShowForm(false);
    setEditingEmployee(null);
  } catch (e) {
    console.error("updateEmployee error:", e);
    notify(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR);
  }
};

export const deleteEmployee = async (
  id: unknown,
  notify: Notify,
  setEmployees: SetEmployees
): Promise<void> => {
  if (!window.confirm("Удалить сотрудника?")) return;
  try {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) throw error;
    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    notify(TOAST_MESSAGES.EMPLOYEE_DELETED, TOAST_TYPES.SUCCESS, TOAST_DURATION.NORMAL);
  } catch (e) {
    console.error("deleteEmployee error:", e);
    notify(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR);
  }
};
