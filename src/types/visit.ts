export type VisitStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'missed' | 'rescheduled';
export type VisitType = 'physical' | 'virtual';

export interface Visit {
  _id: string;
  referenceId: string;
  buyerId: string;
  propertyId: string;
  enquiryId?: string;
  visitDate: string;
  visitTime?: string;
  visitType: VisitType;
  virtualPlatform?: string | null;
  meetingLink?: string;
  status: VisitStatus;
  rescheduleCount?: number;
  cancelReason?: string;
  propertySnapshot?: { title?: string; location?: string; price?: number | null };
  createdAt?: string;
}

export interface VisitSlot {
  time: string;
  available: boolean;
  status: 'available' | 'booked';
  remainingCapacity: number;
  bookedCount: number;
}

/** `GET /api/v1/visits/availability` — visits/service.js `availability()`. */
export interface VisitAvailability {
  propertyId: string;
  visitType: VisitType;
  timezone: string;
  from: string;
  to: string;
  days: Array<{ date: string; slots: VisitSlot[] }>;
}

export interface CreateVisitPayload {
  propertyId: string;
  enquiryId?: string;
  visitDate: string;
  visitTime: string;
  visitType: VisitType;
  preferredLanguage?: 'English' | 'Tamil' | 'Hindi' | 'Kannada';
}
