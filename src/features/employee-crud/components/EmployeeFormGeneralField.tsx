import React, { memo } from "react";
import type { FieldConfig } from "./employeeFormTypes";

export const GeneralField = memo(function GeneralField({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldConfig;
  value: string;
  error?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <div className="employees-form-group">
      <label htmlFor={field.name}>
        {field.label}{" "}
        {field.required && <span className="required">*</span>}
      </label>

      <input
        id={field.name}
        name={field.name}
        type={field.type}
        value={value || ""}
        onChange={onChange}
        placeholder={field.placeholder || ""}
        className={error ? "input-error" : ""}
        aria-invalid={Boolean(error)}
      />

      {error && <p className="employees-error">{error}</p>}
    </div>
  );
});
