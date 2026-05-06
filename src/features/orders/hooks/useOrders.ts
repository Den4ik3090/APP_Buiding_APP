import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchOrders,
  fetchRegistryEmployees,
  deleteOrder,
} from '../services/ordersService';
import type { RegistryEmployee } from '../services/ordersService';
import type { Order } from '@/entities/order';

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

export function useDeleteOrderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
