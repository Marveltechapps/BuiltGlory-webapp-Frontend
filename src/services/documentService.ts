import { apiGet, apiUpload } from './api';
import type { UploadedDocument } from '../types/misc';

type OwnerType = 'user' | 'sell_request' | 'support_ticket';
type Purpose = 'property_media' | 'support_attachment' | 'kyc';

/** POST /documents (multipart, field "file") — returns the stored document with its `url`. */
export function uploadDocument(file: File, ownerType: OwnerType, ownerId: string, purpose: Purpose, documentType: string) {
  const form = new FormData();
  form.append('file', file);
  form.append('ownerType', ownerType);
  form.append('ownerId', ownerId);
  form.append('purpose', purpose);
  form.append('documentType', documentType);
  return apiUpload<UploadedDocument>('/documents', form);
}

/** GET /documents/:id/read-url — short-lived URL for a private file the caller owns. */
export function documentReadUrl(documentId: string) {
  return apiGet<{ documentId: string; readUrl: string; expiresInSeconds: number }>(`/documents/${encodeURIComponent(documentId)}/read-url`);
}
