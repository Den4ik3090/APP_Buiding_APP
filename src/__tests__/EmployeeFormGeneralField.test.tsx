import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GeneralField } from '../features/employee-crud/components/EmployeeFormGeneralField';
import type { FieldConfig } from '../features/employee-crud/components/employeeFormTypes';

const field: FieldConfig = {
  label: 'ФИО',
  name: 'name',
  type: 'text',
  placeholder: 'Иван Петров',
  required: true,
};

describe('<GeneralField />', () => {
  it('renders label text', () => {
    render(<GeneralField field={field} value="" onChange={jest.fn()} />);
    expect(screen.getByText(/ФИО/i)).toBeInTheDocument();
  });

  it('marks required fields with *', () => {
    render(<GeneralField field={field} value="" onChange={jest.fn()} />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not render * for optional fields', () => {
    const optionalField: FieldConfig = { ...field, required: false };
    render(<GeneralField field={optionalField} value="" onChange={jest.fn()} />);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('renders the current value', () => {
    render(<GeneralField field={field} value="Тест Тестов" onChange={jest.fn()} />);
    expect(screen.getByDisplayValue('Тест Тестов')).toBeInTheDocument();
  });

  it('calls onChange when input changes', () => {
    const onChange = jest.fn();
    render(<GeneralField field={field} value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Новое имя' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('shows error message when error prop is provided', () => {
    render(<GeneralField field={field} value="" error="Обязательное поле" onChange={jest.fn()} />);
    expect(screen.getByText('Обязательное поле')).toBeInTheDocument();
  });

  it('adds input-error class when error is present', () => {
    render(<GeneralField field={field} value="" error="Ошибка" onChange={jest.fn()} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('input-error');
  });

  it('sets aria-invalid when error is present', () => {
    render(<GeneralField field={field} value="" error="Ошибка" onChange={jest.fn()} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});
