export const PERMIT_TYPES = [
  "Наряд на работы на высоте",
  "Наряд на огневые работы ",
  "Наряд на стропальные и работы повышенной опасности",
];

export const PERMIT_STATUSES = {
  ACTIVE: "Активен",
  EXTENDED: "Продлен",
  EXPIRED: "Просрочен",
  CLOSED: "Закрыт",
};

export const STATUS_COLORS = {
  [PERMIT_STATUSES.ACTIVE]: {
    bg: "#dcfce7",
    text: "#166534",
    border: "#86efac",
  },
  [PERMIT_STATUSES.EXTENDED]: {
    bg: "#dbeafe",
    text: "#1d4ed8",
    border: "#93c5fd",
  },
  [PERMIT_STATUSES.EXPIRED]: {
    bg: "#fee2e2",
    text: "#991b1b",
    border: "#fca5a5",
  },
  [PERMIT_STATUSES.CLOSED]: {
    bg: "#fee2e2",
    text: "#991b1b",
    border: "#fecaca",
  },
};

export const STATUS_EMOJI = {
  [PERMIT_STATUSES.ACTIVE]: "✅",
  [PERMIT_STATUSES.EXTENDED]: "🕒",
  [PERMIT_STATUSES.EXPIRED]: "⚠️",
  [PERMIT_STATUSES.CLOSED]: "🔒",
};

export const NOTIFICATION_MESSAGES = {
  CANNOT_EXTEND: "Наряд нельзя продлить",
  PERMIT_EXTENDED: "Наряд успешно продлен",
  ERROR_EXTENDING: "Ошибка продления наряда",
  CANNOT_CLOSE: "Наряд нельзя закрыть",
  PERMIT_CLOSED: "Наряд успешно закрыт",
  ERROR_CLOSING: "Ошибка закрытия наряда",
};
