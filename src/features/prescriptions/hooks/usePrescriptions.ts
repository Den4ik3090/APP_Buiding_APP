import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPrescriptions,
  fetchRegistryEmployees,
  deletePrescription,
} from '../services/prescriptionsService';
import type { RegistryEmployee } from '../services/prescriptionsService';
import type { Prescription } from '@/entities/prescription';

export function usePrescriptionsQuery() {
  return useQuery<Prescription[], Error>({
    queryKey: ['prescriptions'],
    queryFn: fetchPrescriptions,
    placeholderData: [],
    throwOnError: false,
  });
}

export function usePrescriptionEmployeesQuery() {
  return useQuery<RegistryEmployee[], Error>({
    queryKey: ['registry-employees'],
    queryFn: fetchRegistryEmployees,
    placeholderData: [],
    throwOnError: false,
  });
}

export function useDeletePrescriptionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePrescription(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescriptions'] });
    },
  });
}
