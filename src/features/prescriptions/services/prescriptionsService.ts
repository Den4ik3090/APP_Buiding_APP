import { supabase } from '@/shared/api/supabase';
import type { Prescription } from '@/entities/prescription';

export interface RegistryEmployee {
  id: string;
  name: string;
  profession: string;
  organization: string;
}

export async function fetchPrescriptions(): Promise<Prescription[]> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .order('issue_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Prescription[];
}

export async function fetchRegistryEmployees(): Promise<RegistryEmployee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, profession, organization')
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as RegistryEmployee[];
}

export async function deletePrescription(id: string): Promise<void> {
  const { error } = await supabase.from('prescriptions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
