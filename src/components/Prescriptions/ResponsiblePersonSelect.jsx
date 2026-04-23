import React, {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Building2, Check, ChevronDown, Search, User, X } from "lucide-react";

const collator = new Intl.Collator("ru", {
  numeric: true,
  sensitivity: "base",
});

const normalizeText = (value = "") => String(value).trim().toLowerCase();

function ResponsiblePersonSelect({
  employees = [],
  inputId,
  selectedPersonId = null,
  onChange = () => {},
  organization = "",
  placeholder = "Выберите ответственного сотрудника",
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

  const selectedEmployee = useMemo(
    () => (selectedPersonId ? employeesById.get(selectedPersonId) : null),
    [employeesById, selectedPersonId]
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

  const selectEmployee = useCallback(
    (employeeId) => {
      onChange(employeeId);
      setIsOpen(false);
    },
    [onChange]
  );

  const clearSelection = useCallback(
    (event) => {
      event.stopPropagation();
      onChange(null);
    },
    [onChange]
  );

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
      className={`responsible-single-picker${isOpen ? " is-open" : ""}${
        disabled ? " is-disabled" : ""
      }`}
    >
      <div className="responsible-single-picker-surface">
        <button
          id={inputId}
          type="button"
          className="responsible-single-picker-trigger"
          onClick={toggleDropdown}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          disabled={disabled}
        >
          <div className="responsible-single-picker-main">
            <div className="responsible-single-picker-headline">
              <span className="responsible-single-picker-title">
                {selectedEmployee
                  ? selectedEmployee.name
                  : placeholder}
              </span>
              <span className="responsible-single-picker-icon">
                <User size={14} />
              </span>
            </div>

            {selectedEmployee && (
              <div className="responsible-single-picker-subtitle">
                <Building2 size={14} />
                <span>
                  {[
                    selectedEmployee.profession,
                    selectedEmployee.organization,
                  ]
                    .filter(Boolean)
                    .join(" • ") || "Должность не указана"}
                </span>
              </div>
            )}

            {!selectedEmployee && organization && (
              <div className="responsible-single-picker-subtitle">
                <Building2 size={14} />
                <span>Организация: {organization}</span>
              </div>
            )}
          </div>

          <div className="responsible-single-picker-controls">
            {selectedEmployee && (
              <button
                type="button"
                className="responsible-single-clear-button"
                onClick={clearSelection}
                aria-label="Очистить выбор"
              >
                <X size={16} />
              </button>
            )}

            <ChevronDown
              size={18}
              className={`responsible-single-picker-chevron${isOpen ? " is-open" : ""}`}
            />
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="responsible-single-picker-panel">
          <div className="responsible-single-picker-toolbar">
            <div className="responsible-single-picker-toolbar-row">
              <div className="responsible-single-picker-scope">
                <span className="responsible-single-filter-pill">
                  <Building2 size={14} />
                  {organization || "Все организации"}
                </span>

                {organization && (
                  <button
                    type="button"
                    className="responsible-single-link-button"
                    onClick={() => setShowAllOrganizations((prev) => !prev)}
                  >
                    {showAllOrganizations
                      ? "Показывать только выбранную организацию"
                      : "Показать всех сотрудников"}
                  </button>
                )}
              </div>

              {selectedPersonId && (
                <button
                  type="button"
                  className="responsible-single-link-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(null);
                  }}
                >
                  Очистить выбор
                </button>
              )}
            </div>

            <div className="responsible-single-search">
              <Search size={16} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск по имени, должности или организации"
              />
            </div>

            <div className="responsible-single-picker-caption-row">
              <span>Найдено сотрудников: {filteredEmployees.length}</span>
            </div>
          </div>

          <div
            className="responsible-single-picker-list"
            role="listbox"
            aria-multiselectable="false"
          >
            {groupedEmployees.length > 0 ? (
              groupedEmployees.map(({ groupName, items }) => (
                <div key={groupName} className="responsible-single-group">
                  {(showAllOrganizations || !organization) && (
                    <div className="responsible-single-group-title">
                      {groupName}
                    </div>
                  )}

                  {items.map((employee) => {
                    const isSelected = selectedPersonId === employee.id;
                    const optionMeta = [
                      employee.profession,
                      employee.organization,
                    ]
                      .filter(Boolean)
                      .join(" • ");

                    return (
                      <button
                        key={employee.id}
                        type="button"
                        className={`responsible-single-option${
                          isSelected ? " is-selected" : ""
                        }`}
                        onClick={() => selectEmployee(employee.id)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="responsible-single-option-indicator">
                          {isSelected && <Check size={14} />}
                        </span>

                        <span className="responsible-single-option-content">
                          <span className="responsible-single-option-name">
                            {employee.name || "Сотрудник без имени"}
                          </span>
                          <span className="responsible-single-option-meta">
                            {optionMeta || "Должность не указана"}
                          </span>
                        </span>

                        {isSelected && (
                          <span className="responsible-single-option-badge">
                            Выбран
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="responsible-single-empty">
                Сотрудники по текущему фильтру не найдены.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ResponsiblePersonSelect);