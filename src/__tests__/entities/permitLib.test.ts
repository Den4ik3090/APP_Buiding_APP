import type { Permit } from '@/entities/permit';
import {
  generatePermitNumber,
  calculateExpiryDate,
  calculateExtendedDate,
  isClosedStatus,
  getPermitStatus,
  canExtend,
  needsWarning,
  getDaysUntilExpiry,
  formatDate,
  formatDateInput,
  validatePermitData,
} from '@/entities/permit/lib';

const isoDate = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const makePermit = (overrides: Partial<Permit> = {}): Partial<Permit> => ({
  status: 'Активен',
  expiry_date: isoDate(10),
  is_extended: false,
  extended_date: null,
  extension_count: 0,
  ...overrides,
});

describe('generatePermitNumber', () => {
  it('generates -1 suffix when no same-day permits exist', () => {
    const result = generatePermitNumber('2024-06-01', []);
    expect(result).toMatch(/-1$/);
  });

  it('increments suffix for same-day existing permits', () => {
    const existing = [{ issue_date: '2024-06-01' }, { issue_date: '2024-06-01' }];
    const result = generatePermitNumber('2024-06-01', existing);
    expect(result).toMatch(/-3$/);
  });

  it('includes day-month prefix', () => {
    const result = generatePermitNumber('2024-06-01', []);
    expect(result).toMatch(/^01-06-/);
  });
});

describe('calculateExpiryDate', () => {
  it('adds 15 days to issue date', () => {
    const issue = new Date('2024-01-01');
    const expiry = calculateExpiryDate('2024-01-01');
    const expected = new Date(issue);
    expected.setDate(expected.getDate() + 15);
    expect(expiry.getDate()).toBe(expected.getDate());
  });
});

describe('calculateExtendedDate', () => {
  it('adds 15 days to expiry date', () => {
    const extended = calculateExtendedDate('2024-01-16');
    expect(extended.getDate()).toBe(31);
  });
});

describe('isClosedStatus', () => {
  it('returns true for "Закрыт"', () => {
    expect(isClosedStatus('Закрыт')).toBe(true);
  });

  it('returns true for lowercase "закрыт"', () => {
    expect(isClosedStatus('закрыт')).toBe(true);
  });

  it('returns true with trailing space', () => {
    expect(isClosedStatus('Закрыт ')).toBe(true);
  });

  it('returns false for null', () => {
    expect(isClosedStatus(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isClosedStatus(undefined)).toBe(false);
  });

  it('returns false for "Активен"', () => {
    expect(isClosedStatus('Активен')).toBe(false);
  });
});

describe('getPermitStatus', () => {
  it('returns "Закрыт" when status is closed', () => {
    expect(getPermitStatus(makePermit({ status: 'Закрыт' }))).toBe('Закрыт');
  });

  it('returns "Просрочен" when expiry is in the past', () => {
    const permit = makePermit({ expiry_date: isoDate(-5) });
    expect(getPermitStatus(permit)).toBe('Просрочен');
  });

  it('returns "Продлен" when is_extended is true and extended_date is in the future', () => {
    const permit = makePermit({
      is_extended: true,
      extended_date: isoDate(5),
      expiry_date: isoDate(-5),
    });
    expect(getPermitStatus(permit)).toBe('Продлен');
  });

  it('returns "Активен" when active and not expired', () => {
    const permit = makePermit({ expiry_date: isoDate(10) });
    expect(getPermitStatus(permit)).toBe('Активен');
  });
});

describe('canExtend', () => {
  it('returns false when is_extended is true', () => {
    expect(canExtend(makePermit({ is_extended: true }))).toBe(false);
  });

  it('returns false when extension_count >= 1', () => {
    expect(canExtend(makePermit({ extension_count: 1 }))).toBe(false);
  });

  it('returns false when permit is closed', () => {
    expect(canExtend(makePermit({ status: 'Закрыт' }))).toBe(false);
  });

  it('returns true for a fresh active permit', () => {
    expect(canExtend(makePermit())).toBe(true);
  });
});

describe('needsWarning', () => {
  it('returns true when 2 days remain', () => {
    expect(needsWarning(makePermit({ expiry_date: isoDate(2) }))).toBe(true);
  });

  it('returns true on expiry day (0 days)', () => {
    expect(needsWarning(makePermit({ expiry_date: isoDate(0) }))).toBe(true);
  });

  it('returns false when already expired (-1 day)', () => {
    expect(needsWarning(makePermit({ expiry_date: isoDate(-1) }))).toBe(false);
  });

  it('returns false when 4+ days remain', () => {
    expect(needsWarning(makePermit({ expiry_date: isoDate(4) }))).toBe(false);
  });

  it('returns false for closed permit', () => {
    expect(needsWarning(makePermit({ status: 'Закрыт', expiry_date: isoDate(1) }))).toBe(false);
  });
});

describe('getDaysUntilExpiry', () => {
  it('returns positive for future expiry', () => {
    expect(getDaysUntilExpiry(makePermit({ expiry_date: isoDate(10) }))).toBeGreaterThan(0);
  });

  it('returns negative for past expiry', () => {
    expect(getDaysUntilExpiry(makePermit({ expiry_date: isoDate(-5) }))).toBeLessThan(0);
  });
});

describe('formatDate', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('formats a date as DD.MM.YYYY', () => {
    expect(formatDate('2024-06-01')).toBe('01.06.2024');
  });
});

describe('formatDateInput', () => {
  it("returns today's date for null", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(formatDateInput(null)).toBe(today);
  });

  it('returns ISO YYYY-MM-DD for a valid date', () => {
    expect(formatDateInput('2024-06-01')).toBe('2024-06-01');
  });
});

describe('validatePermitData', () => {
  it('returns errors when permit_type is missing', () => {
    const result = validatePermitData({
      issue_date: '2024-06-01',
      responsible_person_id: 'uuid-1',
      organization: 'ООО Тест',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.permit_type).toBeDefined();
  });

  it('returns errors when issue_date is missing', () => {
    const result = validatePermitData({
      permit_type: 'Тип 1',
      responsible_person_id: 'uuid-1',
      organization: 'ООО Тест',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.issue_date).toBeDefined();
  });

  it('returns errors when organization is too short', () => {
    const result = validatePermitData({
      permit_type: 'Тип 1',
      issue_date: '2024-06-01',
      responsible_person_id: 'uuid-1',
      organization: 'A',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.organization).toBeDefined();
  });

  it('returns valid when all required fields are provided', () => {
    const result = validatePermitData({
      permit_type: 'Тип 1',
      issue_date: '2024-06-01',
      responsible_person_id: 'uuid-1',
      organization: 'ООО Тест',
    });
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });
});
