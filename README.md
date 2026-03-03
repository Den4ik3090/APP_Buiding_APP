# 📊 Система учёта инструктажей и обучений сотрудников

> Комплексное веб-приложение для контроля сроков проведения обязательных инструктажей, профессиональных обучений и действия удостоверений с интеграцией Telegram-уведомлений.

[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react)](https://react.dev/)
[![Webpack](https://img.shields.io/badge/Webpack-5-8DD6F9?logo=webpack)](https://webpack.js.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)](https://supabase.com/)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-26A5E4?logo=telegram)](https://telegram.org/)

---

## 🎯 Описание проекта

Система автоматизирует полный цикл учёта обязательных мероприятий по охране труда в строительных и производственных организациях в соответствии с требованиями законодательства РФ. Приложение контролирует:

- **Инструктажи по охране труда** (вводный, первичный, повторный)
- **Профессиональные обучения** (рабочие профессии, специальности)
- **Удостоверения и сертификаты** (допуски, разрешения, квалификационные документы)
- **Автоматические уведомления** о приближающихся сроках истечения

### Основные возможности

- **Регистрация сотрудников** - профили с фото, должностями и историей инструктажей.
- **Дополнительные обучения** - фиксация курсов повышения квалификации и аттестаций.
- **Учёт удостоверений** - строгий контроль сроков действия лицензий и допусков.
- **Умная индикация** - цветовое кодирование статусов (актуально / истекает / просрочено).
- **Telegram-интеграция** - мгновенная отправка отчётов и уведомлений через Edge Functions.
- **Проактивные напоминания** - автоматические алерты за 30, 15 и 7 дней до дедлайна.
- **Адаптивность** - полноценная работа на десктопах, планшетах и смартфонах.

---

## 🛠 Технологический стек

- **Frontend:** React 18.3, Webpack 5, Sass (SCSS), Babel.
- **Backend:** Supabase (PostgreSQL), Edge Functions (Deno runtime).
- **Storage:** Supabase Storage для хранения скан-копий и фото.
- **API:** Telegram Bot API для предиктивных уведомлений.

---

## 🚀 Быстрый старт

### Предварительные требования
- Node.js >= 18.x
- npm >= 9.x
- Аккаунт в Supabase

### 1. Клонирование и установка
```bash
git clone [https://github.com/YourUsername/YourRepo.git](https://github.com/YourUsername/YourRepo.git)
cd YourRepo
npm install




2. Настройка базы данных (SQL)
Выполните следующие запросы в SQL Editor вашего Supabase проекта:

SQL
-- Таблица сотрудников
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  profession TEXT NOT NULL,
  training_date DATE NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица обучений
CREATE TABLE additional_trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  training_name TEXT NOT NULL,
  training_type TEXT NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  document_url TEXT
);

-- Индексы для оптимизации
CREATE INDEX idx_training_date ON employees(training_date);
CREATE INDEX idx_expiry_date ON additional_trainings(expiry_date);
3. Переменные окружения
Создайте файл .env (не забудьте добавить его в .gitignore!) или настройте src/supabaseClient.js:

JavaScript
const supabaseUrl = '[https://your-project-ref.supabase.co](https://your-project-ref.supabase.co)';
const supabaseKey = 'your-anon-public-key';
4. Настройка Telegram уведомлений
Получите токен у @BotFather.

Установите секреты в Supabase CLI:

Bash
npx supabase secrets set TELEGRAM_BOT_TOKEN=your_token
npx supabase secrets set TELEGRAM_CHAT_ID=your_chat_id
Деплой функции:

Bash
npx supabase functions deploy telegram-notify
5. Запуск
Bash
npm start # Режим разработки
npm run build # Сборка для продакшна

