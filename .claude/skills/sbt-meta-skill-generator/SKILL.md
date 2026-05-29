---
name: sbt-meta-skill-generator
description: >
  Generates a new production-grade SKILL.md for the PUTEVI Safety project following
  the enterprise skill standard. Use when creating a new Claude Code skill, adding
  a new automation, or standardizing an existing ad-hoc skill. Activates on:
  "create skill", "new skill", "add skill", "automate", "skill template", "skill
  generator". Runs duplicate detection before generation. NOT for editing existing
  skills — edit them directly.
argument-hint: "<skill-name> [--archetype audit|scaffold|guard|protocol|report|orchestrator]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
metadata:
  type: scaffold
  scope: read-write
  domain: sbt-specific
---

# SBT Meta-Skill Generator

## Когда активировать

Пользователь хочет создать новый навык для автоматизации повторяющейся задачи в проекте PUTEVI Safety. Навык ещё не существует или существует как неформализованное поведение в CLAUDE.md.

## Когда НЕ активировать

- Редактирование существующего навыка — правь SKILL.md напрямую.
- Создание GSD-навыка — они живут в `~/.claude/get-shit-done/`, не здесь.

## Input contract

Перед генерацией СПРОСИТЬ, если не предоставлено:

1. **Имя** — kebab-case, начинается с `sbt-` для проектных навыков (например, `sbt-incident-response`)
2. **Атомарная задача** — одно предложение: что делает навык и зачем
3. **Архетип** — один из: `audit` / `scaffold` / `guard` / `protocol` / `report` / `orchestrator`
4. **Триггеры активации** — 3–7 ключевых слов / фраз пользователя
5. **Конкурирующие навыки** — какие существующие навыки могут активироваться на те же триггеры

Если любой пункт отсутствует — СПРОСИТЬ. Не изобретать.

---

## Pipeline

### Step 1 — Explore: Разведка существующих навыков

```bash
# Найти все существующие SKILL.md
find .claude/skills/ -name "SKILL.md" | sort

# Проверить дубли по ключевому слову задачи
grep -rl "{{атомарная задача — ключевое слово}}" .claude/skills/ --include="SKILL.md"

# Проверить конфликты description по триггерам
grep -rn "{{триггер_1}}\|{{триггер_2}}" .claude/skills/ --include="SKILL.md"
```

Если найден дубль → **СТОП**. Сообщить: «Навык `X` уже покрывает эту задачу (строка Y). Предлагаю расширить его вместо создания нового.»

### Step 2 — Contract: Выбор архетипа и ограничений инструментов

Определить `allowed-tools` по таблице архетипов:

| Архетип | allowed-tools | Типичный размер body |
|---|---|---|
| `audit` | Read, Bash, Grep, Glob | ≤ 500 токенов |
| `scaffold` | Read, Write, Bash, Grep, Glob | ≤ 800 токенов |
| `guard` | Read | ≤ 200 токенов |
| `protocol` | Read, Bash, Grep | ≤ 500 токенов |
| `report` | Read, Bash, Write | ≤ 600 токенов |
| `orchestrator` | Read, Bash, Task, AskUserQuestion | ≤ 1200 токенов |

### Step 3 — Validate: Предварительная проверка качества

Перед записью файла проверить по чеклисту:

- [ ] `name` в kebab-case, без пробелов, начинается с `sbt-`
- [ ] `description` ≤ 150 токенов; нет слов «helpful», «useful», «manages», «allows»
- [ ] `description` содержит секцию «Активируется при:» с 3–7 триггерами
- [ ] `description` содержит «НЕ использовать когда:» с хотя бы одним исключением
- [ ] `allowed-tools` соответствует архетипу из таблицы выше
- [ ] Тело навыка не дублирует содержимое CLAUDE.md дословно
- [ ] Нет фраз «Use this skill when» в разговорном стиле — только декларативно
- [ ] Для `scaffold`/`orchestrator` архетипов: есть verification gates с bash-командами

### Step 4 — Output: Запись файла

Создать директорию и файл:

```bash
mkdir -p .claude/skills/{{name}}
# Записать SKILL.md по шаблону ниже
```

---

## Шаблон SKILL.md

```markdown
---
name: {{kebab-case-name}}
description: >
  {{Одно действие}} для {{конкретного контекста PUTEVI Safety}}.
  Активируется при: {{триггер_1}}, {{триггер_2}}, {{триггер_3}}.
  НЕ использовать когда: {{конкурирующий навык}} покрывает {{исключение}}.
argument-hint: "{{args}} [--flags]"
allowed-tools:
  - Read
  - Bash
  # Добавить согласно таблице архетипов
metadata:
  type: {{audit|scaffold|guard|protocol|report|orchestrator}}
  scope: {{read-only|read-write|orchestrating}}
  domain: sbt-specific
  invokes_after: []
---

# {{Название навыка}}

## Когда активировать

{{1–2 предложения: конкретная ситуация. Без слова "useful".}}

## Когда НЕ активировать

{{Явные исключения. Ссылки на конкурирующие навыки по имени.}}

## Input contract

{{Перечень того, что пользователь ОБЯЗАН предоставить. Если отсутствует — СПРОСИТЬ.}}

## Pipeline

### Step 1 — Explore
\`\`\`bash
# Конкретные команды разведки
\`\`\`

### Step 2 — Contract
\`\`\`bash
# Проверка дублей и конфликтов
grep -rl "{{ключевое слово}}" .claude/skills/ --include="SKILL.md"
# Если найдено → СТОП, сообщить о конфликте
\`\`\`

### Step 3 — Validate
\`\`\`bash
# Gate 1 — TypeScript (если навык генерирует код)
npx tsc --noEmit
# Expected: 0 errors

# Gate 2 — FSD boundary (если навык касается services/)
grep -rn "supabase.from" src/features --include="*.tsx" | grep -v "/services/"
# Expected: пусто
\`\`\`

### Step 4 — Output

\`\`\`
## Результат

| Аспект        | Состояние | Действие |
|---------------|-----------|----------|
| {{аспект_1}}  | ✅/❌      | {{...}}  |

## Итоговый вердикт
[PASS / NEEDS FIXES / BLOCKED] — {{одна строка причина}}
\`\`\`

## Anti-patterns (запрещено в этом навыке)

- `as any` — никогда
- Прямые вызовы `supabase.from` вне `services/`
- Изменение Realtime channel-строк без явного запроса
- Изменение auth-flow без явного запроса
- Комментарии типа «WHAT» вместо «WHY»

## Coordination

| Перед этим навыком | После этого навыка |
|---|---|
| {{навык, который должен выполниться до}} | {{навык для запуска после}} |
```

---

## Token Efficiency Rules

1. `description` ≤ 150 токенов — это единственное, что читается при маршрутизации.
2. Body ≤ 500 токенов для `audit`/`guard`/`protocol`. Body ≤ 800 для `scaffold`. Body ≤ 1200 для `orchestrator`.
3. Обширные справочные данные (таблицы, большие примеры) — выносить в `reference/` подпапку, подключать через `@` только при необходимости.
4. Не копировать содержимое CLAUDE.md — ссылаться на него концептуально.
5. Не писать вводные абзацы типа «This skill provides...» — сразу к делу.

## Anti-patterns генератора

- Создавать навык, который дублирует раздел CLAUDE.md — добавить абзац в CLAUDE.md вместо нового файла.
- Создавать навык без `allowed-tools` — это отключает контроль инструментального доступа.
- Ставить слишком широкий `description` — вызовет ложные активации.
- Создавать навык без явного «НЕ использовать когда» — конкурирующие навыки будут перехватывать запросы.
- Называть навык без префикса `sbt-` для проектных навыков — нарушает пространство имён.
