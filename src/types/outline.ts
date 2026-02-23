export interface OutlinePagination {
  limit?: number;
  offset?: number;
  nextPath?: string | null;
  total?: number;
}

export interface OutlinePolicy {
  id?: string;
  [key: string]: unknown;
}

export interface OutlineDocument {
  id: string;
  urlId?: string;
  title?: string;
  text?: string;
  collectionId?: string | null;
  parentDocumentId?: string | null;
  updatedAt?: string;
  createdAt?: string;
  archivedAt?: string | null;
  deletedAt?: string | null;
  publishedAt?: string | null;
  [key: string]: unknown;
}

export interface OutlineSearchResult {
  context?: string;
  ranking?: number;
  document: OutlineDocument;
  [key: string]: unknown;
}

export interface OutlineRpcEnvelope<T> {
  ok?: boolean;
  status?: number;
  data?: T;
  error?: string;
  message?: string;
  success?: boolean;
  pagination?: OutlinePagination;
  policies?: OutlinePolicy[];
  [key: string]: unknown;
}

