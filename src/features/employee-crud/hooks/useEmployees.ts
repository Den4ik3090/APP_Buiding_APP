import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Employee } from '@/entities/employee';
import {
  fetchEmployees,
  fetchDismissedEmployees,
  fetchOrganizations,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  retrainEmployee,
  dismissEmployee,
  restoreEmployee,
} from '../services/employeesService';

export function useEmployeesQuery() {
  return useQuery<Employee[], Error>({
    queryKey: ['employees'],
    queryFn: fetchEmployees,
    placeholderData: [],
    throwOnError: false,
    retry: (failureCount, error) => {
      if (error.message === 'timeout') return false;
      return failureCount < 2;
    },
  });
}

export function useOrganizationsQuery() {
  return useQuery<string[], Error>({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
    placeholderData: [],
    throwOnError: false,
  });
}

export function useAddEmployeeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Employee) => createEmployee(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useUpdateEmployeeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Employee) => updateEmployee(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeleteEmployeeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useRetrainEmployeeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => retrainEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDismissedEmployeesQuery(enabled = false) {
  return useQuery<Employee[], Error>({
    queryKey: ['employees', 'dismissed'],
    queryFn: fetchDismissedEmployees,
    placeholderData: [],
    throwOnError: false,
    enabled,
  });
}

export function useDismissEmployeeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dismissEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useRestoreEmployeeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
