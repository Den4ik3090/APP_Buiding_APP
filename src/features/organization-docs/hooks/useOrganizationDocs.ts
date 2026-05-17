import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchOrgDocs,
  upsertOrgDoc,
  upsertManyOrgDocs,
  type OrgDoc,
  type DocsStatus,
} from '../services/organizationDocsService';

const ORG_DOCS_KEY = ['org-docs'] as const;

export function useOrgDocsQuery() {
  return useQuery<OrgDoc[], Error>({
    queryKey: ORG_DOCS_KEY,
    queryFn: fetchOrgDocs,
    placeholderData: [],
    throwOnError: false,
  });
}

export function useUpsertOrgDocMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgName, status }: { orgName: string; status: DocsStatus }) =>
      upsertOrgDoc(orgName, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ORG_DOCS_KEY });
    },
  });
}

export function useUpsertManyOrgDocsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docs: OrgDoc[]) => upsertManyOrgDocs(docs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ORG_DOCS_KEY });
    },
  });
}
