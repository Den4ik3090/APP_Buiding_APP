import {
  getDaysDifference,
  getStatusKey,
  isTrainingExpired,
  hasExpiredAdditional,
} from '@/entities/employee/lib';

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

describe('getDaysDifference', () => {
  it('returns positive number for a past date', () => {
    const result = getDaysDifference(daysAgo(100));
    expect(result).toBeGreaterThanOrEqual(99);
    expect(result).toBeLessThanOrEqual(101);
  });

  it('returns negative number for a future date', () => {
    const result = getDaysDifference(daysAgo(-10));
    expect(result).toBeLessThan(0);
  });

  it('returns ~0 for today', () => {
    const result = getDaysDifference(daysAgo(0));
    expect(result).toBeGreaterThanOrEqual(-1);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('getStatusKey', () => {
  it('returns "expired" for days >= 90', () => {
    expect(getStatusKey(90)).toBe('expired');
    expect(getStatusKey(200)).toBe('expired');
  });

  it('returns "warning" for days >= 75 and < 90', () => {
    expect(getStatusKey(75)).toBe('warning');
    expect(getStatusKey(89)).toBe('warning');
  });

  it('returns "valid" for days < 75', () => {
    expect(getStatusKey(74)).toBe('valid');
    expect(getStatusKey(0)).toBe('valid');
    expect(getStatusKey(-5)).toBe('valid');
  });
});

describe('isTrainingExpired', () => {
  it('returns false when dateReceived is null', () => {
    expect(isTrainingExpired(null, 12)).toBe(false);
  });

  it('returns false when dateReceived is undefined', () => {
    expect(isTrainingExpired(undefined, 12)).toBe(false);
  });

  it('returns false when expiryMonths is null', () => {
    expect(isTrainingExpired(daysAgo(400), null)).toBe(false);
  });

  it('returns true when training expired over a year ago', () => {
    expect(isTrainingExpired(daysAgo(730), 12)).toBe(true);
  });

  it('returns false when training expiry is in the future', () => {
    expect(isTrainingExpired(daysAgo(180), 12)).toBe(false);
  });

  it('coerces string expiryMonths same as number', () => {
    expect(isTrainingExpired(daysAgo(730), '12')).toBe(true);
    expect(isTrainingExpired(daysAgo(180), '12')).toBe(false);
  });
});

describe('hasExpiredAdditional', () => {
  it('returns false for undefined input', () => {
    expect(hasExpiredAdditional(undefined)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(hasExpiredAdditional([])).toBe(false);
  });

  it('returns false when all trainings are valid', () => {
    const trainings = [{ dateReceived: daysAgo(180), expiryMonths: 12 }];
    expect(hasExpiredAdditional(trainings)).toBe(false);
  });

  it('returns true when one training is expired', () => {
    const trainings = [{ dateReceived: daysAgo(730), expiryMonths: 12 }];
    expect(hasExpiredAdditional(trainings)).toBe(true);
  });

  it('returns true when mixed — at least one expired', () => {
    const trainings = [
      { dateReceived: daysAgo(180), expiryMonths: 12 },
      { dateReceived: daysAgo(730), expiryMonths: 12 },
    ];
    expect(hasExpiredAdditional(trainings)).toBe(true);
  });
});
