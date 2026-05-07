import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPermits,
  fetchRegistryEmployees,
  createPermit,
  updatePermit,
  deletePermit,
} from '../services/permitsService';
import type { PermitWithEmployee, RegistryEmployee } from '../services/permitsService';
import type { PermitInsert, PermitUpdate } from '@/entities/permit';

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

export function useCreatePermitMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PermitInsert) => createPermit(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permits'] });
    },
  });
}

export function useUpdatePermitMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PermitUpdate }) =>
      updatePermit(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permits'] });
    },
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
