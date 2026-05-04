export interface Permit {
  id: string;
  permit_number: string;
  permit_type: string;
  issue_date: string;
  expiry_date: string | null;
  extended_date: string | null;
  closed_date: string | null;
  responsible_person_id: string | null;
  organization: string;
  status: string;
  is_extended: boolean;
  extension_count: number;
  created_at?: string;
}

export type PermitInsert = Omit<Permit, 'id' | 'created_at'>;
export type PermitUpdate = Partial<PermitInsert>;
