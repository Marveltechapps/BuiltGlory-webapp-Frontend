/** `GET /api/v1/me/notifications` items (notifications/schema.js, channel in_app). */
export interface AppNotification {
  _id: string;
  event: string;
  title?: string;
  message?: string;
  notificationType?: string;
  listingId?: string;
  enquiryId?: string;
  propertyId?: string;
  dealId?: string;
  screen?: string;
  entityId?: string;
  entityType?: string;
  isRead: boolean;
  createdAt: string;
}

export type SupportCategory = 'property_inquiry' | 'payment' | 'technical' | 'kyc' | 'general' | 'complaint';
export type SupportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportResponse {
  _id?: string;
  message: string;
  responderType: 'admin' | 'customer' | 'system';
  clientMessageId?: string;
  readAt?: string;
  createdAt: string;
}

/** Support ticket / live chat (supportTickets/schema.js). */
export interface SupportTicket {
  _id: string;
  referenceId: string;
  category: SupportCategory;
  subject: string;
  message: string;
  status: SupportStatus;
  priority?: string;
  channel: 'ticket' | 'live_chat';
  attachments?: string[];
  responses?: SupportResponse[];
  unreadCustomerCount?: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt?: string;
}

/** CMS content item (content/schema.js). */
export interface ContentItem {
  _id: string;
  slug: string;
  section: string;
  title: string;
  excerpt?: string;
  body?: string;
  category?: string;
  imageUrl?: string;
  order?: number;
  metadata?: {
    icon?: string;
    topicLabel?: string;
    lastUpdatedLabel?: string;
    version?: string;
    copyright?: string;
    address?: string;
    tagline?: string;
    [key: string]: unknown;
  };
  updatedAt?: string;
  publishedAt?: string;
}

/** `GET /api/v1/app/config` (appConfig/service.js). */
export interface AppConfig {
  versions?: { current?: string; minimumSupported?: string; latest?: string };
  storeUrls?: { ios?: string | null; android?: string | null };
  maintenance?: { enabled?: boolean; message?: string; expectedBackAt?: string | null };
  featureFlags?: Record<string, unknown>;
  payment?: { tokenAmount?: number; escrow?: unknown };
  support?: {
    phone?: string;
    supportPhone?: string;
    supportPhoneE164?: string;
    supportEmail?: string;
    whatsappNumber?: string;
    whatsappUrl?: string;
    telUrl?: string;
  };
}

/** `POST /api/v1/documents` result (documents/schema.js). */
export interface UploadedDocument {
  _id: string;
  referenceId: string;
  url?: string;
  fileName?: string;
  mimeType?: string;
  status?: string;
}

export type CallbackSlot = 'morning' | 'afternoon' | 'evening';
