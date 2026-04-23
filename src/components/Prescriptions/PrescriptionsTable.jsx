import React, { memo, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  ExternalLink,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  PRESCRIPTION_STATUSES,
  PRESCRIPTION_STATUS_LABELS,
} from "./PrescriptionsRegistry";

const collator = new Intl.Collator("ru", {
  numeric: true,
  sensitivity: "base",
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU");

const getComparableValue = (prescription, field) => {
  switch (field) {
    case "issue_date":
      return prescription.issue_date
        ? new Date(prescription.issue_date).getTime()
        : 0;
    case "deadline":
      return prescription.deadline
        ? new Date(prescription.deadline).getTime()
        : 0;
    case "responsible_person":
      return prescription.responsible_person?.name || "";
    case "actual_status":
      return prescription.actual_status || "";
    default:
      return prescription[field] || "";
  }
};

const comparePrescriptions = (left, right, field, direction) => {
  const leftValue = getComparableValue(left, field);
  const rightValue = getComparableValue(right, field);
  const sortDirection = direction === "asc" ? 1 : -1;

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return (leftValue - rightValue) * sortDirection;
  }

  return (
    collator.compare(String(leftValue), String(rightValue)) * sortDirection
  );
};

const hasProtocol = (value) => /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);
const isWindowsFilePath = (value) => /^[a-zA-Z]:[\\/]/.test(value);
const isNetworkFilePath = (value) => /^\\\\/.test(value);

const resolveDocumentHref = (documentUrl) => {
  const normalizedUrl = String(documentUrl || "").trim();

  if (!normalizedUrl) {
    return "";
  }

  if (isWindowsFilePath(normalizedUrl)) {
    return `file:///${normalizedUrl.replace(/\\/g, "/")}`;
  }

  if (isNetworkFilePath(normalizedUrl)) {
    return `file:${normalizedUrl.replace(/\\/g, "/")}`;
  }

  if (normalizedUrl.startsWith("//")) {
    return `${window.location.protocol}${normalizedUrl}`;
  }

  if (hasProtocol(normalizedUrl)) {
    return normalizedUrl;
  }

  try {
    return new URL(normalizedUrl, window.location.origin).toString();
  } catch {
    return normalizedUrl;
  }
};

const getDownloadFileName = (documentUrl, prescriptionNumber) => {
  const fallbackName = `predpisanie-${String(
    prescriptionNumber || "document"
  )
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")}`;

  try {
    const resolvedUrl = new URL(resolveDocumentHref(documentUrl));
    const rawName = resolvedUrl.pathname.split("/").pop();

    if (rawName) {
      return decodeURIComponent(rawName);
    }
  } catch {
    return fallbackName;
  }

  return fallbackName;
};

const StatusBadge = ({ status }) => {
  const statusConfig = {
    [PRESCRIPTION_STATUSES.OPEN]: {
      icon: Clock,
      className: "prescription-status-open",
    },
    [PRESCRIPTION_STATUSES.IN_PROGRESS]: {
      icon: Clock,
      className: "prescription-status-in-progress",
    },
    [PRESCRIPTION_STATUSES.COMPLETED]: {
      icon: CheckCircle2,
      className: "prescription-status-completed",
    },
    [PRESCRIPTION_STATUSES.OVERDUE]: {
      icon: XCircle,
      className: "prescription-status-overdue",
    },
  };

  const config = statusConfig[status] || statusConfig[PRESCRIPTION_STATUSES.OPEN];
  const Icon = config.icon;

  return (
    <span className={`prescription-status-badge ${config.className}`}>
      <Icon size={14} />
      <span>{PRESCRIPTION_STATUS_LABELS[status]}</span>
    </span>
  );
};

const DeadlineCell = ({ deadline, status }) => {
  if (!deadline) {
    return <span className="prescriptions-muted-text">Не указан</span>;
  }

  const today = new Date().toISOString().split("T")[0];
  const isOverdue =
    status !== PRESCRIPTION_STATUSES.COMPLETED && deadline < today;
  const daysUntilDeadline = Math.ceil(
    (new Date(deadline) - new Date(today)) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="prescription-deadline-cell">
      <Calendar size={14} />
      <span className={isOverdue ? "prescription-deadline-overdue" : ""}>
        {dateFormatter.format(new Date(deadline))}
      </span>
      {status !== PRESCRIPTION_STATUSES.COMPLETED && (
        <span
          className={`prescription-days-badge ${
            isOverdue
              ? "prescription-days-overdue"
              : daysUntilDeadline <= 7
                ? "prescription-days-soon"
                : ""
          }`}
        >
          {isOverdue
            ? `Просрочено на ${Math.abs(daysUntilDeadline)} дн.`
            : `Осталось ${daysUntilDeadline} дн.`}
        </span>
      )}
    </div>
  );
};

function PrescriptionsTable({
  prescriptions = [],
  onEdit = () => {},
  onDelete = () => {},
  hasFilters = false,
}) {
  const [sortField, setSortField] = useState("issue_date");
  const [sortDirection, setSortDirection] = useState("desc");

  const sortedPrescriptions = useMemo(() => {
    return [...prescriptions].sort((left, right) =>
      comparePrescriptions(left, right, sortField, sortDirection)
    );
  }, [prescriptions, sortDirection, sortField]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "issue_date" ? "desc" : "asc");
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} />;
    }

    return sortDirection === "asc" ? (
      <ArrowUp size={14} />
    ) : (
      <ArrowDown size={14} />
    );
  };

  if (prescriptions.length === 0) {
    return (
      <div className="prescriptions-empty">
        <p>
          {hasFilters
            ? "По заданным фильтрам ничего не найдено."
            : "Предписаний пока нет."}
        </p>
        <p className="prescriptions-empty-caption">
          {hasFilters
            ? "Попробуйте изменить поиск или сбросить фильтры."
            : "Добавьте первое предписание, чтобы оно появилось в реестре."}
        </p>
      </div>
    );
  }

  return (
    <div className="prescriptions-table-container">
      <table className="prescriptions-table">
        <thead>
          <tr>
            <th>
              <button
                type="button"
                className="prescriptions-sort-button"
                onClick={() => toggleSort("issue_date")}
              >
                Дата выписки {getSortIcon("issue_date")}
              </button>
            </th>

            <th>
              <button
                type="button"
                className="prescriptions-sort-button"
                onClick={() => toggleSort("prescription_number")}
              >
                Номер {getSortIcon("prescription_number")}
              </button>
            </th>

            <th>
              <button
                type="button"
                className="prescriptions-sort-button"
                onClick={() => toggleSort("title")}
              >
                Название/Нарушение {getSortIcon("title")}
              </button>
            </th>

            <th>
              <button
                type="button"
                className="prescriptions-sort-button"
                onClick={() => toggleSort("object")}
              >
                Объект {getSortIcon("object")}
              </button>
            </th>

            <th>
              <button
                type="button"
                className="prescriptions-sort-button"
                onClick={() => toggleSort("responsible_person")}
              >
                Ответственный {getSortIcon("responsible_person")}
              </button>
            </th>

            <th>
              <button
                type="button"
                className="prescriptions-sort-button"
                onClick={() => toggleSort("deadline")}
              >
                Срок устранения {getSortIcon("deadline")}
              </button>
            </th>

            <th>
              <button
                type="button"
                className="prescriptions-sort-button"
                onClick={() => toggleSort("actual_status")}
              >
                Статус {getSortIcon("actual_status")}
              </button>
            </th>

            <th className="prescriptions-download-column">Документ</th>

            <th className="prescriptions-actions-column">Действия</th>
          </tr>
        </thead>

        <tbody>
          {sortedPrescriptions.map((prescription) => {
            const documentHref = resolveDocumentHref(
              prescription.document_url
            );
            const hasDocumentReference = Boolean(
              String(prescription.document_url || "").trim()
            );
            const downloadFileName = getDownloadFileName(
              prescription.document_url,
              prescription.prescription_number
            );

            return (
              <tr key={prescription.id}>
                <td>
                  {dateFormatter.format(new Date(prescription.issue_date))}
                </td>

                <td>
                  <span className="prescription-number-badge">
                    {prescription.prescription_number}
                  </span>
                </td>

                <td>
                  <div className="prescription-title-cell">
                    <div className="prescription-title-content">
                      <span className="prescription-title-text">
                        {prescription.title}
                      </span>

                      {(prescription.organization ||
                        prescription.document_url) && (
                        <div className="prescription-title-meta">
                          {prescription.organization && (
                            <span className="prescription-organization-chip">
                              {prescription.organization}
                            </span>
                          )}

                          {prescription.document_url && (
                            <a
                              href={documentHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="prescription-document-link"
                              title="Открыть документ"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <ExternalLink size={14} />
                              <span>Документ</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td>{prescription.object || "Не указан"}</td>

                <td>
                  {prescription.responsible_person ? (
                    <div className="prescription-responsible-cell">
                      <span className="prescription-responsible-name">
                        {prescription.responsible_person.name}
                      </span>
                      {prescription.responsible_person.profession && (
                        <span className="prescription-responsible-position">
                          {prescription.responsible_person.profession}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="prescriptions-muted-text">
                      Не назначен
                    </span>
                  )}
                </td>

                <td>
                  <DeadlineCell
                    deadline={prescription.deadline}
                    status={prescription.actual_status}
                  />
                </td>

                <td>
                  <StatusBadge status={prescription.actual_status} />
                </td>

                <td>
                  {hasDocumentReference ? (
                    <a
                      href={documentHref}
                      download={downloadFileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="prescription-download-link"
                      title={`Открыть или скачать предписание ${prescription.prescription_number}`}
                    >
                      <Download size={14} />
                      <span>Скачать</span>
                    </a>
                  ) : (
                    <span className="prescriptions-muted-text">Нет файла</span>
                  )}
                </td>

                <td>
                  <div className="prescription-actions">
                    <button
                      type="button"
                      className="btn-action btn-edit"
                      onClick={() => onEdit(prescription)}
                      aria-label={`Редактировать предписание ${prescription.prescription_number}`}
                      title="Редактировать"
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      type="button"
                      className="btn-action btn-delete"
                      onClick={() => onDelete(prescription.id)}
                      aria-label={`Удалить предписание ${prescription.prescription_number}`}
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default memo(PrescriptionsTable);