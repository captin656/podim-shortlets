// Plain, serialisable shapes that pages and client components consume.
// The data layer maps database rows into these so UI code never touches Prisma types directly.

import type { SeasonalRule } from "./pricing";

export type PolicyKey = "FLEXIBLE" | "MODERATE" | "STRICT";
export type PropertyTypeKey = "STUDIO" | "ONE_BED" | "TWO_BED" | "THREE_BED" | "PENTHOUSE";

export type ImageView = { url: string; alt: string };
export type AmenityView = { slug: string; name: string; icon: string };

export type ApartmentView = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  propertyType: PropertyTypeKey;
  address: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
  pricePerNight: number;
  weekendPrice: number | null;
  weeklyDiscount: number;
  monthlyDiscount: number;
  cleaningFee: number;
  cautionFee: number;
  minNights: number;
  maxNights: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  checkInTime: string;
  checkOutTime: string;
  houseRules: string[];
  cancellationPolicy: PolicyKey;
  isInstantBook: boolean;
  isFeatured: boolean;
  videoUrl: string | null;
  hostName: string;
  ratingAvg: number;
  ratingCount: number;
  images: ImageView[];
  amenities: AmenityView[];
  seasonal: SeasonalRule[];
};

export type ReviewView = {
  id: string;
  rating: number;
  comment: string;
  guestName: string;
  createdAt: string;
  reply: string | null;
  apartmentTitle?: string;
  apartmentSlug?: string;
};

export type SettingsView = {
  businessName: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  serviceFeePercent: number;
  taxPercent: number;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  flexibleFreeHours: number;
  moderateDays: number;
  moderateRefundPercent: number;
  holdMinutes: number;
};

export type ApartmentFilters = {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  types?: string[];
  instant?: boolean;
  guests?: number;
  checkIn?: string;
  checkOut?: string;
  sort?: "featured" | "price-asc" | "price-desc" | "rating";
};
