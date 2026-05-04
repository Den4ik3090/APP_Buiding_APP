export interface Prescription {
  id: string;
  prescription_number: string;
  title: string;
  status: string;
  organization: string | null;
  object: string | null;
  issue_date: string;
  deadline: string | null;
  responsible_person_id: string | null;
  created_at?: string;
}

export type PrescriptionInsert = Omit<Prescription, 'id' | 'created_at'>;
export type PrescriptionUpdate = Partial<PrescriptionInsert>;
