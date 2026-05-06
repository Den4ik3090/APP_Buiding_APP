import React, { memo, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Edit2,
  ExternalLink,
  Trash2,
} from "lucide-react";

const collator = new Intl.Collator("ru", {
  numeric: true,
  sensitivity: "base",
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU");

const getComparableValue = (order, field) => {
  switch (field) {
    case "creation_date":
      return order.creation_date ? new Date(order.creation_date).getTime() : 0;
    case "responsible_persons_names":
      return (order.responsible_persons_names || []).join(", ");
    default:
      return order[field] || "";
  }
};

const compareOrders = (leftOrder, rightOrder, field, direction) => {
  const leftValue = getComparableValue(leftOrder, field);
  const rightValue = getComparableValue(rightOrder, field);
  const sortDirection = direction === "asc" ? 1 : -1;

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return (leftValue - rightValue) * sortDirection;
  }

  return collator.compare(String(leftValue), String(rightValue)) * sortDirection;
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

const getDownloadFileName = (documentUrl, orderNumber) => {
  const fallbackName = `prikaz-${String(orderNumber || "document")
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

function OrdersTable({
  orders = [],
  onEdit = () => {},
  onDelete = () => {},
  hasFilters = false,
}) {
  const [sortField, setSortField] = useState("creation_date");
  const [sortDirection, setSortDirection] = useState("desc");

  const sortedOrders = useMemo(() => {
    return [...orders].sort((leftOrder, rightOrder) =>
      compareOrders(leftOrder, rightOrder, sortField, sortDirection)
    );
  }, [orders, sortDirection, sortField]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "creation_date" ? "desc" : "asc");
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} />;
    }

    return sortDirection === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  if (orders.length === 0) {
    return (
      <div className="orders-empty">
        <p>{hasFilters ? "По заданным фильтрам ничего не найдено." : "Приказов пока нет."}</p>
        <p className="orders-empty-caption">
          {hasFilters
            ? "Попробуйте изменить поиск или сбросить фильтры."
            : "Создайте первый приказ, чтобы он появился в реестре."}
        </p>
      </div>
    );
  }

  return (
    <div className="orders-table-container">
      <table className="orders-table">
        <thead>
          <tr>
            <th>
              <button
                type="button"
                className="orders-sort-button"
                onClick={() => toggleSort("creation_date")}
              >
                Дата создания {getSortIcon("creation_date")}
              </button>
            </th>

            <th>
              <button
                type="button"
                className="orders-sort-button"
                onClick={() => toggleSort("order_number")}
              >
                Номер приказа {getSortIcon("order_number")}
              </button>
            </th>

            <th>
              <button
                type="button"
                className="orders-sort-button"
                onClick={() => toggleSort("order_name")}
              >
                Наименование {getSortIcon("order_name")}
              </button>
            </th>

            <th>
              <button
                type="button"
                className="orders-sort-button"
                onClick={() => toggleSort("object")}
              >
                Объект {getSortIcon("object")}
              </button>
            </th>

            <th>
              <button
                type="button"
                className="orders-sort-button"
                onClick={() => toggleSort("responsible_persons_names")}
              >
                Ответственные {getSortIcon("responsible_persons_names")}
              </button>
            </th>

            <th className="orders-download-column">Скачать приказ</th>

            <th className="orders-actions-column">Действия</th>
          </tr>
        </thead>

        <tbody>
          {sortedOrders.map((order) => {
            const responsibleNames = order.responsible_persons_names || [];
            const responsibleTitle = responsibleNames.join(", ");
            const documentHref = resolveDocumentHref(order.document_url);
            const hasDocumentReference = Boolean(String(order.document_url || "").trim());
            const downloadFileName = getDownloadFileName(
              order.document_url,
              order.order_number
            );

            return (
              <tr key={order.id}>
                <td>{dateFormatter.format(new Date(order.creation_date))}</td>

                <td>
                  <span className="order-number-badge">{order.order_number}</span>
                </td>

                <td>
                  <div className="order-name-cell">
                    <div className="order-name-content">
                      <span className="order-name-text">{order.order_name}</span>

                      {(order.organization || order.document_url) && (
                        <div className="order-name-meta">
                          {order.organization && (
                            <span className="order-organization-chip">
                              {order.organization}
                            </span>
                          )}

                          {order.document_url && (
                            <a
                              href={documentHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="order-document-link"
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

                <td>{order.object || "Не указан"}</td>

                <td>
                  <div
                    className="responsible-persons-cell"
                    title={responsibleTitle || "Ответственные не назначены"}
                  >
                    {responsibleNames.length > 0 ? (
                      <>
                        {responsibleNames.slice(0, 2).map((name) => (
                          <span key={`${order.id}-${name}`} className="person-badge">
                            {name}
                          </span>
                        ))}

                        {responsibleNames.length > 2 && (
                          <span className="person-badge person-badge-more">
                            +{responsibleNames.length - 2}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="orders-muted-text">Не назначены</span>
                    )}
                  </div>
                </td>

                <td>
                  {hasDocumentReference ? (
                    <a
                      href={documentHref}
                      download={downloadFileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="order-download-link"
                      title={`Открыть или скачать приказ ${order.order_number}`}
                    >
                      <Download size={14} />
                      <span>Скачать</span>
                    </a>
                  ) : (
                    <span className="orders-muted-text">Нет файла</span>
                  )}
                </td>

                <td>
                  <div className="order-actions">
                    <button
                      type="button"
                      className="btn-action btn-edit"
                      onClick={() => onEdit(order)}
                      aria-label={`Редактировать приказ ${order.order_number}`}
                      title="Редактировать"
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      type="button"
                      className="btn-action btn-delete"
                      onClick={() => onDelete(order.id)}
                      aria-label={`Удалить приказ ${order.order_number}`}
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

export default memo(OrdersTable);
