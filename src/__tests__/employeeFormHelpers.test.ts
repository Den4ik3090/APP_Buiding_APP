import { checkTrainingStatus, getTodayDateValue, createInitialFormData } from '../features/employee-crud/components/employeeFormHelpers';

describe('checkTrainingStatus', () => {
  const addMonths = (months: number): string => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  };

  it('returns neutral when dateReceived is empty', () => {
    const result = checkTrainingStatus('', 12);
    expect(result).toEqual({ isExpired: false, isSoon: false, daysLeft: 0 });
  });

  it('returns neutral when months is undefined', () => {
    const result = checkTrainingStatus('2024-01-01', undefined);
    expect(result).toEqual({ isExpired: false, isSoon: false, daysLeft: 0 });
  });

  it('detects expired training (expiry date in the past)', () => {
    const dateReceived = addMonths(-13); // started 13 months ago
    const { isExpired, isSoon, daysLeft } = checkTrainingStatus(dateReceived, 12);
    expect(isExpired).toBe(true);
    expect(isSoon).toBe(false);
    expect(daysLeft).toBeLessThanOrEqual(0);
  });

  it('detects soon-expiring training (within 30 days)', () => {
    // received 11 months + 1 day ago with 12-month expiry → ~29 days left
    const d = new Date();
    d.setMonth(d.getMonth() - 11);
    d.setDate(d.getDate() - 1);
    const dateReceived = d.toISOString().slice(0, 10);
    const { isExpired, isSoon, daysLeft } = checkTrainingStatus(dateReceived, 12);
    expect(isExpired).toBe(false);
    expect(isSoon).toBe(true);
    expect(daysLeft).toBeGreaterThan(0);
    expect(daysLeft).toBeLessThanOrEqual(30);
  });

  it('detects valid training far in the future', () => {
    const dateReceived = addMonths(-1); // started 1 month ago
    const { isExpired, isSoon, daysLeft } = checkTrainingStatus(dateReceived, 24);
    expect(isExpired).toBe(false);
    expect(isSoon).toBe(false);
    expect(daysLeft).toBeGreaterThan(30);
  });

  it('handles string months (from form input)', () => {
    const dateReceived = addMonths(-13);
    const { isExpired } = checkTrainingStatus(dateReceived, '12');
    expect(isExpired).toBe(true);
  });
});

describe('getTodayDateValue', () => {
  it('returns a valid YYYY-MM-DD string', () => {
    const result = getTodayDateValue();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns today\'s date', () => {
    const today = new Date().toISOString().slice(0, 10);
    // Allow 1-day drift due to timezone edge cases
    const result = getTodayDateValue();
    const diff = Math.abs(new Date(result).getTime() - new Date(today).getTime());
    expect(diff).toBeLessThanOrEqual(86_400_000);
  });
});

describe('createInitialFormData', () => {
  it('returns empty strings for all text fields', () => {
    const data = createInitialFormData();
    expect(data.name).toBe('');
    expect(data.profession).toBe('');
    expect(data.organization).toBe('');
    expect(data.comment).toBe('');
    expect(data.photo_url).toBe('');
  });

  it('sets trainingDate to today', () => {
    const data = createInitialFormData();
    const today = getTodayDateValue();
    expect(data.trainingDate).toBe(today);
  });

  it('initializes additionalTrainings as empty array', () => {
    const data = createInitialFormData();
    expect(data.additionalTrainings).toEqual([]);
  });
});
