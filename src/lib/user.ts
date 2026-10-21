import type { User } from '../types/user';
import { prettyMobile } from './format';

export const displayName = (u: User | null) => u?.name?.trim() || 'Builtglory user';

export const roleLabel = (u: User | null) => {
  if (!u) return '';
  if (u.userType === 'nri' || u.userType === 'pio') return 'NRI';
  return u.role === 'seller' ? 'Seller' : u.role === 'both' ? 'Buyer & Seller' : 'Buyer';
};

export const mobileOf = (u: User | null) => prettyMobile(u?.mobileNumber || u?.phone || u?.phoneNormalized);
