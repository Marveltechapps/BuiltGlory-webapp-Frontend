/** Property `type` values accepted by `GET /api/v1/properties` (constants/enums.js PROPERTY_TYPES). */
export type ApiPropertyType =
  | 'plot' | 'apartment' | 'residential' | 'commercial' | 'organic_home' | '3d_printing' | 'fractional'
  | 'ceo_mansion' | 'holiday_home' | 'land' | 'farmhouse' | 'nri' | 'interior' | 'villa';

export type PropertyStatus = 'draft' | 'available' | 'reserved' | 'under_construction' | 'sold';

export interface PropertyAddress {
  line1?: string;
  line2?: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
}

export interface PropertyMedia {
  photos?: string[];
  coverPhoto?: string;
  videoUrl?: string;
  droneImageUrl?: string;
  tour3dUrl?: string;
  floorPlanUrl?: string;
}

/** `specs` is a Mixed field; these are the keys the backend filters and sell flow use. */
export interface PropertySpecs {
  bhk?: string | number;
  builtUpArea?: number | string;
  carpetArea?: number | string;
  plotArea?: number | string;
  area?: number | string;
  floor?: string | number;
  totalFloors?: number | string;
  facing?: string;
  furnishing?: string;
  age?: string;
  unitNo?: string;
  unitNumber?: string;
  [key: string]: unknown;
}

export interface NearbyPlace {
  name?: string;
  type?: string;
  distance?: string;
}

export interface Property {
  _id: string;
  id?: string;
  referenceId: string;
  title: string;
  description?: string;
  type: ApiPropertyType;
  status: PropertyStatus;
  isFeatured?: boolean;
  isUpcoming?: boolean;
  address?: PropertyAddress;
  price: number;
  isNegotiable?: boolean;
  specs?: PropertySpecs;
  amenities?: string[];
  media?: PropertyMedia;
  advantages?: { investment?: string[]; location?: string[]; connectivity?: string[] };
  nearbyPlaces?: NearbyPlace[];
  highlights?: string[];
  metrics?: { savedCount?: number; views?: number; enquiries?: number; visits?: number; compareCount?: number };
  savedByUsers?: string[];
  launchDate?: string;
  possessionDate?: string;
  soldAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Query accepted by `GET /api/v1/properties` (properties/validator.js listValidator). */
export interface PropertyListQuery {
  type?: ApiPropertyType;
  city?: string;
  locality?: string;
  minPrice?: number;
  maxPrice?: number;
  bhk?: string;
  amenities?: string;
  verified?: boolean;
  negotiable?: boolean;
  recentlySold?: boolean;
  featured?: boolean;
  upcoming?: boolean;
  search?: string;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'oldest';
  page?: number;
  limit?: number;
}
