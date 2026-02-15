import { supabase } from "../supabaseClient";

const SEP = ";";
const BOM = "\uFEFF";

const escapeCell = (val) => {
  const s = val == null ? "" : String(val);
  if (/[;"\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
};

const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "" : date.toLocaleDateString("ru-RU");
};

const sanitizeFileName = (name) => {
  const safe = (name || "").toString().trim();
  if (!safe) return "Обучения";
  return safe
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const mapTraining = (t) => ({
  title: t?.title ?? t?.type ?? "",
  completed_at: t?.completed_at ?? t?.dateReceived ?? t?.date ?? "",
  certificate_url: t?.certificate_url ?? t?.certificate ?? t?.url ?? "",
  hours: t?.hours ?? t?.duration ?? "",
});

export async function downloadWorkerTrainings(workerId, workerName) {
  const { data, error } = await supabase
    .from("employees")
    .select("additional_trainings")
    .eq("id", workerId)
    .single();

  if (error) {
    const status = error?.status || error?.statusCode;
    if (status === 404 || error?.code === "PGRST301") {
      throw new Error("Таблица employees не найдена или недоступна");
    }
    throw error;
  }

  const trainingsRaw = data?.additional_trainings;
  const trainings = Array.isArray(trainingsRaw) ? trainingsRaw : [];
  if (trainings.length === 0) {
    return { count: 0 };
  }

  const headers = [
    "Название обучения",
    "Дата прохождения",
    "Сертификат",
    "Кол-во часов",
  ];

  const lines = trainings.map((t) => {
    const row = mapTraining(t);
    return [
      escapeCell(row.title),
      escapeCell(formatDate(row.completed_at)),
      escapeCell(row.certificate_url),
      escapeCell(row.hours),
    ].join(SEP);
  });

  const csv = BOM + headers.join(SEP) + "\r\n" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Обучения_${sanitizeFileName(workerName)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  return { count: trainings.length };
}

export default downloadWorkerTrainings;
