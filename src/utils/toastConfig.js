export const TOAST_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
};

export const TOAST_DURATION = {
  SHORT: 2000,
  NORMAL: 4000,
  LONG: 6000,
  PERSISTENT: 0, // Не исчезает автоматически
};

/**
 * Предустановленные сообщения
 */
export const TOAST_MESSAGES = {
  // Сотрудники
  EMPLOYEE_ADDED: "Сотрудник успешно добавлен ✨",
  EMPLOYEE_UPDATED: "Данные сотрудника обновлены 📝",
  EMPLOYEE_DELETED: "Сотрудник удален 🗑️",
  EMPLOYEE_RETRAINED: "Переподготовка отмечена ✅",

  // Фото
  PHOTO_UPLOADED: "Фото успешно загружено 📸",
  PHOTO_UPLOAD_ERROR: "Ошибка при загрузке фото",

  // Экспорт
  EXPORT_SUCCESS: "Данные экспортированы 📊",
  EXPORT_ERROR: "Ошибка при экспорте",

  // Валидация
  VALIDATION_ERROR: "Заполните все обязательные поля",
  REQUIRED_FIELD: "Это поле обязательно",

  // Ошибки БД
  DB_ERROR: "Ошибка при работе с базой данных",
  NETWORK_ERROR: "Проблема с интернет-соединением",

  // Другое
  OPERATION_SUCCESS: "Операция выполнена успешно",
  OPERATION_ERROR: "Ошибка при выполнении операции",
};

/**
 * Функция для быстрого создания уведомления об ошибке
 */
export const getErrorMessage = (error) => {
  if (error?.message) {
    return error.message;
  }
  return TOAST_MESSAGES.OPERATION_ERROR;
};
