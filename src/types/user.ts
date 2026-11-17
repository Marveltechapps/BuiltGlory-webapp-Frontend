export type UserType = 'resident' | 'nri' | 'pio';
export type CustomerRole = 'buyer' | 'seller' | 'both';

export interface ChannelPreference {
  transactional?: boolean;
  marketing?: boolean;
}

export type PreferenceChannel = 'push' | 'whatsapp' | 'sms' | 'email' | 'in_app';

export type NotificationPreferences = Partial<Record<PreferenceChannel, ChannelPreference>>;

export interface BankDetails {
  accountHolderName?: string;
  bankName?: string;
  accountNumberLast4?: string;
  ifsc?: string;
  branch?: string;
  upiId?: string;
  updatedAt?: string;
}

export interface AccountDeletionStatus {
  status: 'none' | 'requested' | 'cancelled' | 'completed';
  reason?: string | null;
  verificationStatus?: string;
  requestedAt?: string;
  scheduledDeletionAt?: string;
  cancelledAt?: string;
  completedAt?: string;
}

/** `GET /api/v1/me` — the User document (users/schema.js). */
export interface User {
  _id: string;
  id?: string;
  referenceId?: string;
  name?: string;
  mobileNumber?: string;
  phone?: string;
  phoneNormalized?: string;
  email?: string;
  isVerified?: boolean;
  userType?: UserType;
  role?: CustomerRole;
  profilePhoto?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  bankDetails?: BankDetails;
  kycStatus?: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  notificationPreferences?: NotificationPreferences;
  preferences?: { language?: string };
  accountDeletion?: AccountDeletionStatus;
  totalEnquiries?: number;
  totalVisits?: number;
  totalDeals?: number;
  totalListings?: number;
  createdAt?: string;
}

/** `PATCH /api/v1/me` body (users/validator.js updateValidator — customer-relevant fields). */
export interface UpdateMePayload {
  name?: string;
  email?: string | null;
  mobileNumber?: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  profilePhoto?: string | null;
  userType?: UserType;
  role?: CustomerRole;
  bankDetails?: {
    accountHolderName: string;
    bankName: string;
    accountNumberLast4: string;
    ifsc: string;
    branch?: string | null;
    upiId?: string | null;
  };
  notificationPreferences?: NotificationPreferences;
  preferences?: { language: 'en' | 'ta' | 'hi' | 'kn' | 'English' | 'Tamil' | 'Hindi' | 'Kannada' };
  privacy?: { personalise?: boolean; shareWithSellers?: boolean; analytics?: boolean; location?: boolean };
}

/** `auth/service.js issueSession` response. */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user?: User;
}

export interface OtpSendResult {
  requestId: string;
  expiresInSeconds: number;
  canResendAt: string;
}

/** `purpose: "change_phone"` verify result. */
export interface PhoneVerifiedResult {
  verified: boolean;
  phone: string;
  phoneNormalized: string;
}
