import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPrescriptions,
  fetchRegistryEmployees,
  createPrescription,
  updatePrescription,
  deletePrescription,
} from '../services/prescriptionsService';
import type { RegistryEmployee } from '../services/prescriptionsService';
import type { Prescription, PrescriptionInsert, PrescriptionUpdate } from '@/entities/prescription';

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
    queryKey: ['registry-employees', 'prescriptions'],
    queryFn: fetchRegistryEmployees,
    placeholderData: [],
    throwOnError: false,
  });
}

export function useCreatePrescriptionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PrescriptionInsert) => createPrescription(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescriptions'] });
    },
  });
}

export function useUpdatePrescriptionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PrescriptionUpdate }) =>
      updatePrescription(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescriptions'] });
    },
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
