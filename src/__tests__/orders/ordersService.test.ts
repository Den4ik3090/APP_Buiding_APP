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
  fetchOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  subscribeToOrders,
} from '@/features/orders/services/ordersService';

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

const mockOrder = { id: '1', order_number: 'P-001', order_name: 'Test Order' };

describe('fetchOrders', () => {
  it('returns orders on success', async () => {
    (supabase.order as jest.Mock).mockResolvedValueOnce({ data: [mockOrder], error: null });
    const result = await fetchOrders();
    expect(result).toEqual([mockOrder]);
  });

  it('throws on Supabase error', async () => {
    (supabase.order as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
    await expect(fetchOrders()).rejects.toThrow('DB error');
  });
});

describe('createOrder', () => {
  it('returns created order on success', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: mockOrder, error: null });
    const result = await createOrder({ order_number: 'P-001' } as never);
    expect(result).toEqual(mockOrder);
  });

  it('throws on Supabase error', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'insert error' } });
    await expect(createOrder({ order_number: 'P-001' } as never)).rejects.toThrow('insert error');
  });
});

describe('updateOrder', () => {
  it('returns updated order on success', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: mockOrder, error: null });
    const result = await updateOrder('1', { order_name: 'Updated' });
    expect(result).toEqual(mockOrder);
  });

  it('throws on Supabase error', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'update error' } });
    await expect(updateOrder('1', { order_name: 'Updated' })).rejects.toThrow('update error');
  });
});

describe('deleteOrder', () => {
  it('resolves without throwing on success', async () => {
    (supabase.eq as jest.Mock).mockResolvedValueOnce({ error: null });
    await expect(deleteOrder('1')).resolves.toBeUndefined();
  });

  it('throws on Supabase error', async () => {
    (supabase.eq as jest.Mock).mockResolvedValueOnce({ error: { message: 'delete error' } });
    await expect(deleteOrder('1')).rejects.toThrow('delete error');
  });
});

describe('subscribeToOrders', () => {
  it('calls supabase.channel with the orders channel name', () => {
    subscribeToOrders(() => {});
    expect(supabase.channel).toHaveBeenCalled();
    const channelArg = (supabase.channel as jest.Mock).mock.calls[0][0];
    expect(typeof channelArg).toBe('string');
    expect(channelArg).toBe('orders_registry_changes');
  });
});
