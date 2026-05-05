import { supabase } from '@/shared/api/supabase';
import type { Order } from '@/entities/order';

export interface RegistryEmployee {
  id: string;
  name: string;
  profession: string;
  organization: string;
}

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('creation_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Order[];
}

export async function fetchRegistryEmployees(): Promise<RegistryEmployee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, profession, organization')
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as RegistryEmployee[];
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
