jest.mock('@/shared/api/supabase', () => {
  const chain: Record<string, jest.Mock> = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    channel: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn(),
    auth: { getUser: jest.fn() },
  };
  return { supabase: chain };
});

import { supabase } from '@/shared/api/supabase';
import {
  fetchPermits,
  createPermit,
  updatePermit,
  deletePermit,
  updatePermitWithStatus,
  subscribeToPermits,
} from '@/features/permits/services/permitsService';

beforeEach(() => {
  jest.clearAllMocks();
  (supabase.from as jest.Mock).mockReturnValue(supabase);
  (supabase.select as jest.Mock).mockReturnValue(supabase);
  (supabase.insert as jest.Mock).mockReturnValue(supabase);
  (supabase.update as jest.Mock).mockReturnValue(supabase);
  (supabase.delete as jest.Mock).mockReturnValue(supabase);
  (supabase.eq as jest.Mock).mockReturnValue(supabase);
  (supabase.order as jest.Mock).mockReturnValue(supabase);
  (supabase.channel as jest.Mock).mockReturnValue(supabase);
  (supabase.on as jest.Mock).mockReturnValue(supabase);
  (supabase.subscribe as jest.Mock).mockReturnValue(supabase);
});

const mockPermit = {
  id: 'p-1',
  permit_number: 'PN-001',
  status: 'Активен',
  is_extended: false,
  expiry_date: null,
  extended_date: null,
  closed_date: null,
};

describe('fetchPermits', () => {
  it('returns permits on success (no auto-close needed)', async () => {
    const closedPermit = { ...mockPermit, status: 'Закрыт' };
    (supabase.order as jest.Mock).mockResolvedValueOnce({ data: [closedPermit], error: null });
    const result = await fetchPermits();
    expect(result).toEqual([closedPermit]);
  });

  it('throws on Supabase error', async () => {
    (supabase.order as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
    await expect(fetchPermits()).rejects.toThrow('DB error');
  });
});

describe('createPermit', () => {
  it('returns created permit on success', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: mockPermit, error: null });
    const result = await createPermit({ permit_number: 'PN-001' } as never);
    expect(result).toEqual(mockPermit);
  });

  it('throws on Supabase error', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'insert error' } });
    await expect(createPermit({ permit_number: 'PN-001' } as never)).rejects.toThrow('insert error');
  });
});

describe('updatePermit', () => {
  it('returns updated permit on success', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: mockPermit, error: null });
    const result = await updatePermit('p-1', { status: 'Закрыт' });
    expect(result).toEqual(mockPermit);
  });

  it('throws on Supabase error', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'update error' } });
    await expect(updatePermit('p-1', { status: 'Закрыт' })).rejects.toThrow('update error');
  });
});

describe('deletePermit', () => {
  it('resolves on clean delete (data returned)', async () => {
    (supabase.select as jest.Mock).mockResolvedValueOnce({ data: [{ id: 'p-1' }], error: null });
    await expect(deletePermit('p-1')).resolves.toBeUndefined();
  });

  it('throws when data is empty array (RLS blocked)', async () => {
    (supabase.select as jest.Mock).mockResolvedValueOnce({ data: [], error: null });
    await expect(deletePermit('p-1')).rejects.toThrow();
  });

  it('runs audit-log cleanup on FK violation (23503) then retries', async () => {
    const fkError = { code: '23503', message: 'Foreign key violation' };
    // First doDelete: eq('id') → chain, select('id') → FK error
    // Audit cleanup: eq('permit_id') → { error: null }
    // Retry doDelete: eq('id') → chain, select('id') → success
    (supabase.eq as jest.Mock)
      .mockReturnValueOnce(supabase)          // doDelete call 1: eq('id', ...) → chain
      .mockResolvedValueOnce({ error: null }) // audit cleanup: eq('permit_id', ...) → terminal
      // retry doDelete: eq('id', ...) uses default mockReturnValue(supabase)
    ;
    (supabase.select as jest.Mock)
      .mockResolvedValueOnce({ data: null, error: fkError })        // doDelete call 1
      .mockResolvedValueOnce({ data: [{ id: 'p-1' }], error: null }); // doDelete retry

    await expect(deletePermit('p-1')).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith('permit_audit_log');
  });

  it('throws after FK cleanup if retry also fails', async () => {
    const fkError = { code: '23503', message: 'Foreign key violation' };
    (supabase.eq as jest.Mock)
      .mockReturnValueOnce(supabase)
      .mockResolvedValueOnce({ error: null });
    (supabase.select as jest.Mock)
      .mockResolvedValueOnce({ data: null, error: fkError })
      .mockResolvedValueOnce({ data: null, error: { message: 'retry failed' } });

    await expect(deletePermit('p-1')).rejects.toThrow('retry failed');
  });
});

describe('updatePermitWithStatus', () => {
  it('returns the first candidate status on success', async () => {
    (supabase.select as jest.Mock).mockResolvedValueOnce({ data: [{ id: 'p-1' }], error: null });
    const result = await updatePermitWithStatus('p-1', {}, ['Активен', 'Просрочен']);
    expect(result).toBe('Активен');
  });

  it('retries with next candidate on CHECK constraint error (23514)', async () => {
    const checkError = { code: '23514', message: 'Check constraint violated' };
    (supabase.select as jest.Mock)
      .mockResolvedValueOnce({ data: null, error: checkError })
      .mockResolvedValueOnce({ data: [{ id: 'p-1' }], error: null });

    const result = await updatePermitWithStatus('p-1', {}, ['Активен', 'Просрочен']);
    expect(result).toBe('Просрочен');
  });

  it('throws when all candidates are exhausted', async () => {
    const checkError = { code: '23514', message: 'Check constraint violated' };
    (supabase.select as jest.Mock).mockResolvedValue({ data: null, error: checkError });

    await expect(updatePermitWithStatus('p-1', {}, ['Активен'])).rejects.toBeTruthy();
  });
});

describe('subscribeToPermits', () => {
  it('calls supabase.channel with the permits channel name', () => {
    subscribeToPermits(() => {});
    expect(supabase.channel).toHaveBeenCalled();
    const channelArg = (supabase.channel as jest.Mock).mock.calls[0][0];
    expect(channelArg).toBe('permits_changes');
  });
});
