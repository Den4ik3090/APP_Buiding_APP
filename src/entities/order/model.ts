export interface Order {
  id: string;
  order_number: string;
  order_name: string;
  object: string | null;
  organization: string | null;
  creation_date: string;
  responsible_persons: string[] | null;
  created_at?: string;
}

export type OrderInsert = Omit<Order, 'id' | 'created_at'>;
export type OrderUpdate = Partial<OrderInsert>;
