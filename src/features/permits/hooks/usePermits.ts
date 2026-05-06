import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPermits,
  fetchRegistryEmployees,
  deletePermit,
} from '../services/permitsService';
import type { PermitWithEmployee, RegistryEmployee } from '../services/permitsService';

export function usePermitsQuery() {
  return useQuery<PermitWithEmployee[], Error>({
    queryKey: ['permits'],
    queryFn: fetchPermits,
    placeholderData: [],
    throwOnError: false,
  });
}

export function usePermitEmployeesQuery() {
  return useQuery<RegistryEmployee[], Error>({
    queryKey: ['registry-employees'],
    queryFn: fetchRegistryEmployees,
    placeholderData: [],
    throwOnError: false,
  });
}

export function useDeletePermitMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePermit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permits'] });
    },
  });
}
