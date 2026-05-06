import React, {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Building2, Check, ChevronDown, Search, Users, X } from "lucide-react";

const collator = new Intl.Collator("ru", {
  numeric: true,
  sensitivity: "base",
});

const normalizeText = (value = "") => String(value).trim().toLowerCase();

function ResponsiblePersonsMultiSelect({
  employees = [],
  inputId,
  selectedPersons = [],
  onChange = () => {},
  organization = "",
  placeholder = "Выберите ответственных сотрудников",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllOrganizations, setShowAllOrganizations] = useState(false);
  const rootRef = useRef(null);
  const searchInputRef = useRef(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const employeesById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees]
  );

  const selectedEmployees = useMemo(
    () =>
      selectedPersons
        .map((personId) => employeesById.get(personId))
        .filter(Boolean)
        .sort((left, right) => collator.compare(left.name || "", right.name || "")),
    [employeesById, selectedPersons]
  );

  const filteredEmployees = useMemo(() => {
    const employeesInScope =
      organization && !showAllOrganizations
        ? employees.filter((employee) => employee.organization === organization)
        : employees;

    const query = normalizeText(deferredSearchQuery);
    if (!query) {
      return employeesInScope;
    }

    return employeesInScope.filter((employee) =>
      [employee.name, employee.profession, employee.organization].some((field) =>
        normalizeText(field).includes(query)
      )
    );
  }, [deferredSearchQuery, employees, organization, showAllOrganizations]);

  const groupedEmployees = useMemo(() => {
    const groups = new Map();

    filteredEmployees.forEach((employee) => {
      const groupName = employee.organization || "Без организации";
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }

      groups.get(groupName).push(employee);
    });

    return Array.from(groups.entries())
      .sort(([left], [right]) => collator.compare(left, right))
      .map(([groupName, items]) => ({
        groupName,
        items: items
          .slice()
          .sort((left, right) => collator.compare(left.name || "", right.name || "")),
      }));
  }, [filteredEmployees]);

  const selectedOutsideCurrentOrganization = useMemo(() => {
    if (!organization) {
      return 0;
    }

    return selectedEmployees.filter(
      (employee) => employee.organization && employee.organization !== organization
    ).length;
  }, [organization, selectedEmployees]);

  const toggleEmployee = useCallback(
    (employeeId) => {
      const nextSelected = selectedPersons.includes(employeeId)
        ? selectedPersons.filter((personId) => personId !== employeeId)
        : [...selectedPersons, employeeId];

      onChange(nextSelected);
    },
    [onChange, selectedPersons]
  );

  const removeEmployee = useCallback(
    (employeeId) => {
      onChange(selectedPersons.filter((personId) => personId !== employeeId));
    },
    [onChange, selectedPersons]
  );

  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const toggleDropdown = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setShowAllOrganizations(false);
      return undefined;
    }

    searchInputRef.current?.focus();

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={rootRef}
      className={`responsible-picker${isOpen ? " is-open" : ""}${
        disabled ? " is-disabled" : ""
      }`}
    >
      <div className="responsible-picker-surface">
        <button
          id={inputId}
          type="button"
          className="responsible-picker-trigger"
          onClick={toggleDropdown}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          disabled={disabled}
        >
          <div className="responsible-picker-main">
            <div className="responsible-picker-headline">
              <span className="responsible-picker-title">
                {selectedPersons.length
                  ? `Выбрано сотрудников: ${selectedPersons.length}`
                  : placeholder}
              </span>
              <span className="responsible-picker-count">
                <Users size={14} />
                {selectedPersons.length}
              </span>
            </div>

            <div className="responsible-picker-subtitle">
              <Building2 size={14} />
              <span>
                {organization
                  ? `Организация: ${organization}`
                  : "Сейчас доступны сотрудники всех организаций"}
              </span>
            </div>
          </div>

          <ChevronDown
            size={18}
            className={`responsible-picker-chevron${isOpen ? " is-open" : ""}`}
          />
        </button>

        {selectedEmployees.length > 0 ? (
          <div className="responsible-picker-tags">
            {selectedEmployees.slice(0, 4).map((employee) => (
              <span key={employee.id} className="responsible-pill">
                <span>{employee.name}</span>
                <button
                  type="button"
                  className="responsible-pill-remove"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeEmployee(employee.id);
                  }}
                  aria-label={`Удалить ${employee.name}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}

            {selectedEmployees.length > 4 && (
              <span className="responsible-pill responsible-pill-muted">
                +{selectedEmployees.length - 4}
              </span>
            )}
          </div>
        ) : (
          <p className="responsible-picker-helper">
            Назначьте минимум одного сотрудника.
          </p>
        )}
      </div>

      {isOpen && (
        <div className="responsible-picker-panel">
          <div className="responsible-picker-toolbar">
            <div className="responsible-picker-toolbar-row">
              <div className="responsible-picker-scope">
                <span className="responsible-filter-pill">
                  <Building2 size={14} />
                  {organization || "Все организации"}
                </span>

                {organization && (
                  <button
                    type="button"
                    className="responsible-link-button"
                    onClick={() =>
                      setShowAllOrganizations((prev) => !prev)
                    }
                  >
                    {showAllOrganizations
                      ? "Показывать только выбранную организацию"
                      : "Показать всех сотрудников"}
                  </button>
                )}
              </div>

              {selectedPersons.length > 0 && (
                <button
                  type="button"
                  className="responsible-link-button"
                  onClick={clearAll}
                >
                  Очистить выбор
                </button>
              )}
            </div>

            <div className="responsible-search">
              <Search size={16} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск по имени, должности или организации"
              />
            </div>

            <div className="responsible-picker-caption-row">
              <span>Найдено сотрудников: {filteredEmployees.length}</span>
              {selectedOutsideCurrentOrganization > 0 && (
                <span className="responsible-selection-warning">
                  Вне текущей организации выбрано:{" "}
                  {selectedOutsideCurrentOrganization}
                </span>
              )}
            </div>
          </div>

          <div
            className="responsible-picker-list"
            role="listbox"
            aria-multiselectable="true"
          >
            {groupedEmployees.length > 0 ? (
              groupedEmployees.map(({ groupName, items }) => (
                <div key={groupName} className="responsible-group">
                  {(showAllOrganizations || !organization) && (
                    <div className="responsible-group-title">{groupName}</div>
                  )}

                  {items.map((employee) => {
                    const isSelected = selectedPersons.includes(employee.id);
                    const optionMeta = [employee.profession, employee.organization]
                      .filter(Boolean)
                      .join(" • ");

                    return (
                      <button
                        key={employee.id}
                        type="button"
                        className={`responsible-option${
                          isSelected ? " is-selected" : ""
                        }`}
                        onClick={() => toggleEmployee(employee.id)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="responsible-option-indicator">
                          {isSelected && <Check size={14} />}
                        </span>

                        <span className="responsible-option-content">
                          <span className="responsible-option-name">
                            {employee.name || "Сотрудник без имени"}
                          </span>
                          <span className="responsible-option-meta">
                            {optionMeta || "Должность не указана"}
                          </span>
                        </span>

                        {isSelected && (
                          <span className="responsible-option-badge">
                            Выбран
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="responsible-empty">
                Сотрудники по текущему фильтру не найдены.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ResponsiblePersonsMultiSelect);
