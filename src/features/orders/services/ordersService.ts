import { supabase } from '@/shared/api/supabase';
import type { Order, OrderInsert, OrderUpdate } from '@/entities/order';

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

export async function createOrder(payload: OrderInsert): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Order;
}

export async function updateOrder(id: string, payload: OrderUpdate): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Order;
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
