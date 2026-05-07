import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchOrders,
  fetchRegistryEmployees,
  createOrder,
  updateOrder,
  deleteOrder,
} from '../services/ordersService';
import type { RegistryEmployee } from '../services/ordersService';
import type { Order, OrderInsert, OrderUpdate } from '@/entities/order';

export function useOrdersQuery() {
  return useQuery<Order[], Error>({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    placeholderData: [],
    throwOnError: false,
  });
}

export function useOrderEmployeesQuery() {
  return useQuery<RegistryEmployee[], Error>({
    queryKey: ['registry-employees'],
    queryFn: fetchRegistryEmployees,
    placeholderData: [],
    throwOnError: false,
  });
}

export function useCreateOrderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: OrderInsert) => createOrder(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OrderUpdate }) =>
      updateOrder(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useDeleteOrderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
