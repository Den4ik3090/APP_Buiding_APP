import { supabase } from '@/shared/api/supabase';

export type DocsStatus = Record<string, boolean>;

export interface OrgDoc {
  org_name: string;
  docs_status: DocsStatus;
  updated_at?: Date;
}

export async function fetchOrgDocs(): Promise<OrgDoc[]> {
  const { data, error } = await supabase.from('organization_docs').select('*');
  if (error) throw error;
  return (data as OrgDoc[]) ?? [];
}

export async function upsertOrgDoc(
  orgName: string,
  docsStatus: DocsStatus
): Promise<void> {
  const { error } = await supabase
    .from('organization_docs')
    .upsert(
      { org_name: orgName, docs_status: docsStatus, updated_at: new Date() },
      { onConflict: 'org_name' }
    );
  if (error) throw error;
}

export async function upsertManyOrgDocs(docs: OrgDoc[]): Promise<void> {
  const payload = docs.map((d) => ({
    org_name: d.org_name,
    docs_status: d.docs_status,
    updated_at: new Date(),
  }));
  const { error } = await supabase
    .from('organization_docs')
    .upsert(payload, { onConflict: 'org_name' });
  if (error) throw error;
}
