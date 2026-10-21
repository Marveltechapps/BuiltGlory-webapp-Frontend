/** Every successful backend response: `{ data, meta: { requestId } }`. List endpoints add pagination to meta. */
export interface ApiMeta {
  requestId?: string;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: ApiMeta;
}

export interface Paginated<T> {
  items: T[];
  meta: ApiMeta;
}

/** Backend error body: `{ error: { code, message, details }, meta }`. */
export interface ApiErrorDetail {
  field?: string;
  message?: string;
}

export interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: ApiErrorDetail[] };
}
