import { supabase } from '@/shared/api/supabase';
import type { Prescription, PrescriptionInsert, PrescriptionUpdate } from '@/entities/prescription';

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

export async function createPrescription(payload: PrescriptionInsert): Promise<Prescription> {
  const { data, error } = await supabase
    .from('prescriptions')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Prescription;
}

export async function updatePrescription(id: string, payload: PrescriptionUpdate): Promise<Prescription> {
  const { data, error } = await supabase
    .from('prescriptions')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Prescription;
}

export async function deletePrescription(id: string): Promise<void> {
  const { error } = await supabase.from('prescriptions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
