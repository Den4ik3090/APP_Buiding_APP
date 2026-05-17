jest.mock('@/shared/api/supabase', () => {
  const chain: Record<string, jest.Mock> = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn(),
    channel: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
  };
  return { supabase: chain };
});

import { supabase } from '@/shared/api/supabase';
import {
  fetchPrescriptions,
  createPrescription,
  updatePrescription,
  deletePrescription,
  subscribeToPrescriptions,
} from '@/features/prescriptions/services/prescriptionsService';

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

const mockPrescription = { id: '1', prescription_number: 'PRP-001', description: 'Test' };

describe('fetchPrescriptions', () => {
  it('returns prescriptions on success', async () => {
    (supabase.order as jest.Mock).mockResolvedValueOnce({ data: [mockPrescription], error: null });
    const result = await fetchPrescriptions();
    expect(result).toEqual([mockPrescription]);
  });

  it('throws on Supabase error', async () => {
    (supabase.order as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
    await expect(fetchPrescriptions()).rejects.toThrow('DB error');
  });
});

describe('createPrescription', () => {
  it('returns created prescription on success', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: mockPrescription, error: null });
    const result = await createPrescription({ prescription_number: 'PRP-001' } as never);
    expect(result).toEqual(mockPrescription);
  });

  it('throws on Supabase error', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'insert error' } });
    await expect(createPrescription({ prescription_number: 'PRP-001' } as never)).rejects.toThrow('insert error');
  });
});

describe('updatePrescription', () => {
  it('returns updated prescription on success', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: mockPrescription, error: null });
    const result = await updatePrescription('1', { description: 'Updated' });
    expect(result).toEqual(mockPrescription);
  });

  it('throws on Supabase error', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'update error' } });
    await expect(updatePrescription('1', { description: 'Updated' })).rejects.toThrow('update error');
  });
});

describe('deletePrescription', () => {
  it('resolves without throwing on success', async () => {
    (supabase.eq as jest.Mock).mockResolvedValueOnce({ error: null });
    await expect(deletePrescription('1')).resolves.toBeUndefined();
  });

  it('throws on Supabase error', async () => {
    (supabase.eq as jest.Mock).mockResolvedValueOnce({ error: { message: 'delete error' } });
    await expect(deletePrescription('1')).rejects.toThrow('delete error');
  });
});

describe('subscribeToPrescriptions', () => {
  it('calls supabase.channel with the prescriptions channel name', () => {
    subscribeToPrescriptions(() => {});
    expect(supabase.channel).toHaveBeenCalled();
    const channelArg = (supabase.channel as jest.Mock).mock.calls[0][0];
    expect(typeof channelArg).toBe('string');
    expect(channelArg).toBe('prescriptions_registry_changes');
    expect(channelArg).not.toContain('order');
  });
});
