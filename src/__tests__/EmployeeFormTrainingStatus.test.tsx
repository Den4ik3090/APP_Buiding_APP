import React from 'react';
import { render, screen } from '@testing-library/react';
import { TrainingStatus } from '../features/employee-crud/components/EmployeeFormTrainingStatus';
import type { FormAdditionalTraining } from '../features/employee-crud/components/employeeFormTypes';

const addMonths = (months: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

const makeTraining = (overrides: Partial<FormAdditionalTraining> = {}): FormAdditionalTraining => ({
  id: 1,
  type: 'Пожарная безопасность',
  dateReceived: addMonths(-1),
  expiryMonths: 24,
  ...overrides,
});

describe('<TrainingStatus />', () => {
  it('shows "Не заполнено" when dateReceived is empty', () => {
    render(<TrainingStatus training={makeTraining({ dateReceived: '' })} />);
    expect(screen.getByText(/не заполнено/i)).toBeInTheDocument();
  });

  it('shows "Не заполнено" when expiryMonths is empty string', () => {
    render(<TrainingStatus training={makeTraining({ expiryMonths: '' })} />);
    expect(screen.getByText(/не заполнено/i)).toBeInTheDocument();
  });

  it('shows "Актуально" for valid training far from expiry', () => {
    render(<TrainingStatus training={makeTraining({ dateReceived: addMonths(-1), expiryMonths: 24 })} />);
    expect(screen.getByText(/актуально/i)).toBeInTheDocument();
  });

  it('shows "Истекло" for expired training', () => {
    render(<TrainingStatus training={makeTraining({ dateReceived: addMonths(-13), expiryMonths: 12 })} />);
    expect(screen.getByText(/истекло/i)).toBeInTheDocument();
  });

  it('shows "Скоро истекает" for training expiring within 30 days', () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 11);
    d.setDate(d.getDate() - 1);
    const dateReceived = d.toISOString().slice(0, 10);
    render(<TrainingStatus training={makeTraining({ dateReceived, expiryMonths: 12 })} />);
    expect(screen.getByText(/скоро истекает/i)).toBeInTheDocument();
  });

  it('displays days remaining in the label', () => {
    render(<TrainingStatus training={makeTraining({ dateReceived: addMonths(-1), expiryMonths: 24 })} />);
    expect(screen.getByText(/дн\./i)).toBeInTheDocument();
  });
});
