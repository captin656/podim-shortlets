// Read-side data layer used by pages. Returns plain serialisable objects.
// With a database it queries Prisma; in development with no DATABASE_URL it serves lib/sample-data.ts.

import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Apartment, ApartmentImage, Amenity, SeasonalPrice, Prisma } from "@prisma/client";
import { hasDb, isPreview, prisma } from "./prisma";
import { getUnavailableNights, liveBookingWhere } from "./availability";
import { addDays, parseISODate, toISODate, todayISO } from "./dates";
import { SAMPLE_AMENITIES, SAMPLE_APARTMENTS, SAMPLE_REVIEWS, SAMPLE_SEASONAL, BASE_HOUSE_RULES } from "./sample-data";
import type { AmenityView, ApartmentFilters, ApartmentView, ReviewView, SettingsView } from "./types";

export const DEFAULT_SETTINGS: SettingsView = {
  businessName: "Podium Apartments",
  tagline: "Serviced apartments in Transekulu, Enugu",
  phone: process.env.NEXT_PUBLIC_PHONE_DISPLAY ?? "+234 800 000 0000",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "2348000000000",
  email: process.env.CONTACT_INBOX_EMAIL ?? "stay@podiumapartments.ng",
  address: "Transekulu, Enugu, Nigeria",
  serviceFeePercent: 5,
  taxPercent: 0,
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  flexibleFreeHours: 48,
  moderateDays: 5,
  moderateRefundPercent: 50,
  holdMinutes: 30,
};

// ───────────────────────── mapping ─────────────────────────

type ApartmentRow = Apartment & { images: ApartmentImage[]; amenities: Amenity[]; seasonalPrices: SeasonalPrice[] };

const apartmentInclude = {
  images: { orderBy: { position: "asc" } },
  amenities: true,
  seasonalPrices: true,
} satisfies Prisma.ApartmentInclude;

export function toApartmentView(r: ApartmentRow): ApartmentView {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    tagline: r.tagline ?? "",
    description: r.description,
    propertyType: r.propertyType,
    address: r.address,
    area: r.area,
    city: r.city,
    lat: r.lat,
    lng: r.lng,
    pricePerNight: r.pricePerNight,
    weekendPrice: r.weekendPrice,
    weeklyDiscount: r.weeklyDiscount,
    monthlyDiscount: r.monthlyDiscount,
    cleaningFee: r.cleaningFee,
    cautionFee: r.cautionFee,
    minNights: r.minNights,
    maxNights: r.maxNights,
    maxGuests: r.maxGuests,
    bedrooms: r.bedrooms,
    beds: r.beds,
    bathrooms: r.bathrooms,
    checkInTime: r.checkInTime,
    checkOutTime: r.checkOutTime,
    houseRules: r.houseRules,
    cancellationPolicy: r.cancellationPolicy,
    isInstantBook: r.isInstantBook,
    isFeatured: r.isFeatured,
    videoUrl: r.videoUrl,
    hostName: r.hostName,
    ratingAvg: r.ratingAvg,
    ratingCount: r.ratingCount,
    images: r.images.map((i) => ({ url: i.url, alt: i.alt ?? r.title })),
    amenities: r.amenities.map((a) => ({ slug: a.slug, name: a.name, icon: a.icon })).sort((a, b) => a.name.localeCompare(b.name)),
    seasonal: r.seasonalPrices.map((s) => ({
      name: s.name,
      startDate: toISODate(s.startDate),
      endDate: toISODate(s.endDate),
      pricePerNight: s.pricePerNight,
      weekendPrice: s.weekendPrice,
    })),
  };
}

// ───────────────────────── sample-mode helpers ─────────────────────────

function sampleReviewsFor(slug: string) {
  return SAMPLE_REVIEWS.filter((r) => r.slug === slug);
}

const sampleApartments: ApartmentView[] = SAMPLE_APARTMENTS.map((a) => {
  const reviews = sampleReviewsFor(a.slug);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return {
    id: `sample-${a.slug}`,
    slug: a.slug,
    title: a.title,
    tagline: a.tagline,
    description: a.description,
    propertyType: a.propertyType,
    address: a.address,
    area: "Transekulu",
    city: "Enugu",
    lat: a.lat,
    lng: a.lng,
    pricePerNight: a.pricePerNight,
    weekendPrice: a.weekendPrice,
    weeklyDiscount: a.weeklyDiscount,
    monthlyDiscount: a.monthlyDiscount,
    cleaningFee: a.cleaningFee,
    cautionFee: a.cautionFee,
    minNights: a.minNights,
    maxNights: a.maxNights,
    maxGuests: a.maxGuests,
    bedrooms: a.bedrooms,
    beds: a.beds,
    bathrooms: a.bathrooms,
    checkInTime: "14:00",
    checkOutTime: "11:00",
    houseRules: BASE_HOUSE_RULES,
    cancellationPolicy: a.cancellationPolicy,
    isInstantBook: a.isInstantBook,
    isFeatured: a.isFeatured,
    videoUrl: null,
    hostName: "Podium Concierge",
    ratingAvg: Math.round(avg * 10) / 10,
    ratingCount: reviews.length,
    images: a.images.map((id, i) => ({
      url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`,
      alt: `${a.title}, photo ${i + 1}`,
    })),
    amenities: a.amenitySlugs.map((s) => SAMPLE_AMENITIES.find((x) => x.slug === s)).filter((x): x is AmenityView => Boolean(x)),
    seasonal: SAMPLE_SEASONAL.map((s) => ({
      name: s.name,
      startDate: s.startDate,
      endDate: s.endDate,
      pricePerNight: Math.round((a.pricePerNight * s.multiplier) / 1000) * 1000,
      weekendPrice: a.weekendPrice ? Math.round((a.weekendPrice * s.multiplier) / 1000) * 1000 : null,
    })),
  };
});

function sortApartments(list: ApartmentView[], sort: ApartmentFilters["sort"]): ApartmentView[] {
  const out = [...list];
  switch (sort) {
    case "price-asc":
      return out.sort((a, b) => a.pricePerNight - b.pricePerNight);
    case "price-desc":
      return out.sort((a, b) => b.pricePerNight - a.pricePerNight);
    case "rating":
      return out.sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount);
    default:
      return out.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.pricePerNight - b.pricePerNight);
  }
}

// ───────────────────────── settings ─────────────────────────

// Cached for a minute and refreshed immediately when an admin saves settings (revalidateTag("settings")).
const readSettings = unstable_cache(
  async (): Promise<SettingsView> => {
    const row = await prisma.setting.findUnique({ where: { id: "main" } });
    if (!row) return DEFAULT_SETTINGS;
    const { id: _id, updatedAt: _u, ...rest } = row;
    return rest;
  },
  ["site-settings"],
  { revalidate: 60, tags: ["settings"] },
);

export const getSettings = cache(async (): Promise<SettingsView> => {
  if (!hasDb) return DEFAULT_SETTINGS;
  return readSettings();
});

// ───────────────────────── apartments ─────────────────────────

export const getAmenities = cache(async (): Promise<AmenityView[]> => {
  if (!hasDb) return SAMPLE_AMENITIES;
  const rows = await prisma.amenity.findMany({ orderBy: { name: "asc" } });
  return rows.map((a) => ({ slug: a.slug, name: a.name, icon: a.icon }));
});

export async function listApartments(filters: ApartmentFilters = {}): Promise<ApartmentView[]> {
  if (!hasDb) {
    let list = sampleApartments;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      list = list.filter((a) => `${a.title} ${a.area} ${a.address} ${a.city}`.toLowerCase().includes(q));
    }
    if (filters.minPrice) list = list.filter((a) => a.pricePerNight >= filters.minPrice!);
    if (filters.maxPrice) list = list.filter((a) => a.pricePerNight <= filters.maxPrice!);
    if (filters.types?.length) list = list.filter((a) => filters.types!.includes(a.propertyType));
    if (filters.instant) list = list.filter((a) => a.isInstantBook);
    if (filters.guests) list = list.filter((a) => a.maxGuests >= filters.guests!);
    if (filters.amenities?.length) list = list.filter((a) => filters.amenities!.every((s) => a.amenities.some((x) => x.slug === s)));
    return sortApartments(list, filters.sort);
  }

  const where: Prisma.ApartmentWhereInput = { isActive: true };
  const and: Prisma.ApartmentWhereInput[] = [];

  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { area: { contains: filters.q, mode: "insensitive" } },
        { address: { contains: filters.q, mode: "insensitive" } },
        { city: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }
  if (filters.minPrice || filters.maxPrice) {
    where.pricePerNight = { ...(filters.minPrice ? { gte: filters.minPrice } : {}), ...(filters.maxPrice ? { lte: filters.maxPrice } : {}) };
  }
  if (filters.types?.length) where.propertyType = { in: filters.types as never[] };
  if (filters.instant) where.isInstantBook = true;
  if (filters.guests) where.maxGuests = { gte: filters.guests };
  for (const slug of filters.amenities ?? []) and.push({ amenities: { some: { slug } } });

  if (filters.checkIn && filters.checkOut) {
    const start = parseISODate(filters.checkIn);
    const end = parseISODate(filters.checkOut);
    const [booked, blocked] = await Promise.all([
      prisma.booking.findMany({
        where: { checkIn: { lt: end }, checkOut: { gt: start }, AND: [liveBookingWhere()] },
        select: { apartmentId: true },
      }),
      prisma.blockedDate.findMany({ where: { startDate: { lt: end }, endDate: { gt: start } }, select: { apartmentId: true } }),
    ]);
    const taken = [...new Set([...booked, ...blocked].map((x) => x.apartmentId))];
    if (taken.length) and.push({ id: { notIn: taken } });
  }
  if (and.length) where.AND = and;

  const rows = await prisma.apartment.findMany({ where, include: apartmentInclude });
  return sortApartments(rows.map(toApartmentView), filters.sort);
}

export const getApartmentBySlug = cache(async (slug: string): Promise<ApartmentView | null> => {
  if (!hasDb) return sampleApartments.find((a) => a.slug === slug) ?? null;
  const row = await prisma.apartment.findFirst({ where: { slug, isActive: true }, include: apartmentInclude });
  return row ? toApartmentView(row) : null;
});

export async function getApartmentById(id: string): Promise<ApartmentView | null> {
  if (!hasDb) return sampleApartments.find((a) => a.id === id) ?? null;
  const row = await prisma.apartment.findUnique({ where: { id }, include: apartmentInclude });
  return row ? toApartmentView(row) : null;
}

export async function getFeatured(limit = 6): Promise<ApartmentView[]> {
  const all = await listApartments({ sort: "featured" });
  const featured = all.filter((a) => a.isFeatured);
  return (featured.length ? featured : all).slice(0, limit);
}

export async function getBestDeals(limit = 4): Promise<ApartmentView[]> {
  const all = await listApartments();
  return all
    .filter((a) => a.weeklyDiscount > 0)
    .sort((a, b) => b.weeklyDiscount - a.weeklyDiscount || a.pricePerNight - b.pricePerNight)
    .slice(0, limit);
}

export async function getSimilar(apt: ApartmentView, limit = 4): Promise<ApartmentView[]> {
  const all = await listApartments();
  return all
    .filter((a) => a.id !== apt.id)
    .sort((a, b) => Math.abs(a.pricePerNight - apt.pricePerNight) - Math.abs(b.pricePerNight - apt.pricePerNight))
    .slice(0, limit);
}

export async function getPriceBounds(): Promise<{ min: number; max: number }> {
  const all = await listApartments();
  if (!all.length) return { min: 20000, max: 120000 };
  const prices = all.map((a) => a.pricePerNight);
  return { min: Math.floor(Math.min(...prices) / 5000) * 5000, max: Math.ceil(Math.max(...prices) / 5000) * 5000 };
}

export async function getAllSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  if (!hasDb) return sampleApartments.map((a) => ({ slug: a.slug, updatedAt: new Date() }));
  return prisma.apartment.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } });
}

// ───────────────────────── availability ─────────────────────────

export async function getUnavailable(apartmentId: string): Promise<string[]> {
  if (!hasDb) return [];
  return getUnavailableNights(prisma, apartmentId, todayISO());
}

// ───────────────────────── reviews ─────────────────────────

function firstName(full: string | null | undefined): string {
  if (!full) return "Guest";
  const [first, ...rest] = full.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0].toUpperCase()}.` : first;
}

export async function getApartmentReviews(apartment: ApartmentView, take = 20): Promise<ReviewView[]> {
  if (!hasDb) {
    return sampleReviewsFor(apartment.slug).map((r, i) => ({
      id: `${apartment.slug}-${i}`,
      rating: r.rating,
      comment: r.comment,
      guestName: r.name,
      createdAt: addDays(todayISO(), -(14 + i * 21)),
      reply: r.reply,
    }));
  }
  const rows = await prisma.review.findMany({
    where: { apartmentId: apartment.id, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    guestName: firstName(r.user.name),
    createdAt: toISODate(r.createdAt),
    reply: r.reply,
  }));
}

export async function getTestimonials(limit = 6): Promise<ReviewView[]> {
  if (!hasDb) {
    return SAMPLE_REVIEWS.slice(0, limit).map((r, i) => {
      const apt = sampleApartments.find((a) => a.slug === r.slug);
      return {
        id: `t-${i}`,
        rating: r.rating,
        comment: r.comment,
        guestName: r.name,
        createdAt: addDays(todayISO(), -(10 + i * 17)),
        reply: r.reply,
        apartmentTitle: apt?.title,
        apartmentSlug: apt?.slug,
      };
    });
  }
  const rows = await prisma.review.findMany({
    where: { status: "APPROVED", rating: { gte: 4 } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true } }, apartment: { select: { title: true, slug: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    guestName: firstName(r.user.name),
    createdAt: toISODate(r.createdAt),
    reply: r.reply,
    apartmentTitle: r.apartment.title,
    apartmentSlug: r.apartment.slug,
  }));
}

export async function getSiteStats(): Promise<{ apartments: number; rating: number; reviews: number }> {
  const list = await listApartments();
  const reviews = list.reduce((s, a) => s + a.ratingCount, 0);
  const weighted = list.reduce((s, a) => s + a.ratingAvg * a.ratingCount, 0);
  return { apartments: list.length, reviews, rating: reviews ? Math.round((weighted / reviews) * 10) / 10 : 0 };
}

export { isPreview };
