---
plan: 01-04
status: complete
completed_at: 2026-05-16
---

# Plan 01-04 Summary: Replace xlsx with exceljs

## Files Changed
- `package.json`: xlsx removed, exceljs ^4.4.0 added
- `package-lock.json`: lockfile updated accordingly
- `src/features/additional-trainings/components/AdditionalTrainingsManager.tsx`: `handleExportExcel` rewritten to use `ExcelJS.Workbook` + `worksheet.columns` + `addRow` + `workbook.xlsx.writeBuffer()`

## Package Info
- exceljs version installed: ^4.4.0
- xlsx removed (was 0.18.5, abandoned, CVEs: prototype pollution, ReDoS, path traversal in parse paths)

## Verification
- `npx tsc --noEmit`: 0 errors
- No xlsx imports remain in src/
- All 9 Russian column headers preserved: ФИО сотрудника, Организация, Профессия, Тип обучения, Дата получения, Срок действия (мес.), Часы, Статус, Сертификат
- Filename pattern unchanged: `additional-trainings-YYYY-MM-DD.xlsx`
- Empty-data guard preserved: `setExportError("Нет данных для экспорта")`
- Dynamic import pattern retained (`await import("exceljs")`) for code-splitting

## Note
`file-saver` remains a dependency unchanged. The xlsx → exceljs swap is write-only — no user-supplied files are ever parsed, so the CVE surface was theoretical but the abandoned dep still warranted removal.
