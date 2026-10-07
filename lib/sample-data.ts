// Starter content for Podium Apartments.
//
// 1. `npm run db:seed` writes this into PostgreSQL.
// 2. With no DATABASE_URL in development, the site renders straight from this file so you can
//    review the design before a database exists. Production never uses this fallback.
//
// Everything here is placeholder: apartment names, the room mix, photos, GPS pins and the guest
// reviews. Replace them in /admin with the real units, real photos and real guest feedback.

import type { PolicyKey, PropertyTypeKey } from "./types";

const photo = (id: string, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const HERO_IMAGE = photo("1618221195710-dd6b41faaea6", 2400);
export const PHOTO_POOL = {
  living: ["1502672260266-1c1ef2d93688", "1522708323590-d24dbb6b0267", "1560448204-e02f11c3d0e2", "1618221195710-dd6b41faaea6", "1600210492486-724fe5c67fb0", "1586023492125-27b2c045efd7"],
  bedroom: ["1505693416388-ac5ce068fe85", "1540518614846-7eded433c457", "1616594039964-ae9021a400a0", "1522771739844-6a9f6d5f14af"],
  kitchen: ["1556909114-f6e7ad7d3136", "1484154218962-a197022b5858", "1556912172-45b7abe8b7e1"],
  bath: ["1552321554-5fefe8c9ef14", "1584622650111-993a426fbf0a"],
  exterior: ["1512917774080-9991f1c4c750", "1545324418-cc1a3fa10c00", "1600585154340-be6161a56a0c", "1600607687939-ce8a6c25118c", "1600566753190-17f0baa2a6c3", "1600573472550-8090b5e0745e"],
};

export const SAMPLE_AMENITIES = [
  { slug: "wifi", name: "Fast Wi-Fi", icon: "wifi" },
  { slug: "power", name: "24/7 power backup", icon: "zap" },
  { slug: "ac", name: "Air conditioning", icon: "snowflake" },
  { slug: "tv", name: "Smart TV with DStv", icon: "tv" },
  { slug: "kitchen", name: "Fully equipped kitchen", icon: "cooking-pot" },
  { slug: "washer", name: "Washing machine", icon: "washing-machine" },
  { slug: "parking", name: "Secure parking", icon: "car" },
  { slug: "security", name: "CCTV and 24h security", icon: "shield-check" },
  { slug: "water", name: "Borehole water", icon: "droplets" },
  { slug: "workspace", name: "Dedicated workspace", icon: "laptop" },
  { slug: "balcony", name: "Private balcony", icon: "sun" },
  { slug: "housekeeping", name: "Daily housekeeping on request", icon: "sparkles" },
];

type SampleApartment = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  propertyType: PropertyTypeKey;
  address: string;
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
  cancellationPolicy: PolicyKey;
  isInstantBook: boolean;
  isFeatured: boolean;
  amenitySlugs: string[];
  images: string[];
  gateCode: string;
  wifiName: string;
  wifiPassword: string;
  arrivalNotes: string;
};

const baseRules = [
  "No smoking indoors. The balcony is fine.",
  "No parties or events. Quiet hours run from 10pm to 7am.",
  "Only registered guests may stay overnight.",
  "Please switch off the AC and lights when you step out.",
  "Report any damage at checkout so your caution can be returned quickly.",
];

const arrival = (floor: string) =>
  `Drive in through the main gate and tell the security desk your booking code. ${floor} Our concierge will meet you at the door if you message us 30 minutes before arrival.`;

export const SAMPLE_APARTMENTS: SampleApartment[] = [
  {
    slug: "podium-studio-one",
    title: "Podium Studio One",
    tagline: "A calm, well-lit studio for solo travellers and short work trips.",
    description:
      "A bright open-plan studio with a queen bed, a proper desk and a kitchenette that actually works. Power never drops thanks to the building's backup, the Wi-Fi is fast enough for video calls, and the blackout curtains make afternoon naps easy after a long day in Enugu.",
    propertyType: "STUDIO",
    address: "Podium Court, Transekulu, Enugu",
    lat: 6.4492,
    lng: 7.5224,
    pricePerNight: 30000,
    weekendPrice: 35000,
    weeklyDiscount: 10,
    monthlyDiscount: 25,
    cleaningFee: 5000,
    cautionFee: 20000,
    minNights: 1,
    maxNights: 60,
    maxGuests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    cancellationPolicy: "FLEXIBLE",
    isInstantBook: true,
    isFeatured: false,
    amenitySlugs: ["wifi", "power", "ac", "tv", "kitchen", "parking", "security", "water", "workspace"],
    images: [PHOTO_POOL.living[0], PHOTO_POOL.bedroom[0], PHOTO_POOL.kitchen[0], PHOTO_POOL.bath[0], PHOTO_POOL.exterior[1]],
    gateCode: "4821",
    wifiName: "Podium-Studio1",
    wifiPassword: "welcome-podium-1",
    arrivalNotes: arrival("The studio is on the ground floor, the first door on your left."),
  },
  {
    slug: "podium-studio-two",
    title: "Podium Studio Two",
    tagline: "A warm studio with a balcony for slow mornings.",
    description:
      "The same easy studio layout, with a private balcony that catches the morning light. A comfortable workspace, a full-size fridge and a rain shower make it a good pick for stays of a week or longer.",
    propertyType: "STUDIO",
    address: "Podium Court, Transekulu, Enugu",
    lat: 6.4494,
    lng: 7.5227,
    pricePerNight: 35000,
    weekendPrice: 40000,
    weeklyDiscount: 10,
    monthlyDiscount: 25,
    cleaningFee: 5000,
    cautionFee: 20000,
    minNights: 1,
    maxNights: 60,
    maxGuests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    cancellationPolicy: "FLEXIBLE",
    isInstantBook: true,
    isFeatured: false,
    amenitySlugs: ["wifi", "power", "ac", "tv", "kitchen", "balcony", "parking", "security", "water", "workspace"],
    images: [PHOTO_POOL.living[1], PHOTO_POOL.bedroom[1], PHOTO_POOL.kitchen[1], PHOTO_POOL.bath[1], PHOTO_POOL.exterior[0]],
    gateCode: "4821",
    wifiName: "Podium-Studio2",
    wifiPassword: "welcome-podium-2",
    arrivalNotes: arrival("The studio is on the first floor, door 2."),
  },
  {
    slug: "executive-one-bed",
    title: "The Executive One-Bed",
    tagline: "A separate bedroom, a proper living room, and a desk worth working at.",
    description:
      "Built for business travellers who want to close the bedroom door on the workday. A king bed, a living room with a smart TV and DStv, a full kitchen and a washing machine mean you can stay a night or a month and never feel short of anything.",
    propertyType: "ONE_BED",
    address: "Podium Court, Transekulu, Enugu",
    lat: 6.4501,
    lng: 7.5231,
    pricePerNight: 40000,
    weekendPrice: 48000,
    weeklyDiscount: 10,
    monthlyDiscount: 25,
    cleaningFee: 7000,
    cautionFee: 30000,
    minNights: 1,
    maxNights: 60,
    maxGuests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    cancellationPolicy: "FLEXIBLE",
    isInstantBook: true,
    isFeatured: true,
    amenitySlugs: ["wifi", "power", "ac", "tv", "kitchen", "washer", "parking", "security", "water", "workspace", "housekeeping"],
    images: [PHOTO_POOL.living[3], PHOTO_POOL.bedroom[2], PHOTO_POOL.kitchen[0], PHOTO_POOL.bath[0], PHOTO_POOL.exterior[2]],
    gateCode: "4821",
    wifiName: "Podium-Exec",
    wifiPassword: "welcome-podium-3",
    arrivalNotes: arrival("The apartment is on the first floor, door 4."),
  },
  {
    slug: "terrace-one-bed",
    title: "The Terrace One-Bed",
    tagline: "A one-bedroom with a private terrace for evenings outside.",
    description:
      "A relaxed one-bedroom where the terrace is the main attraction. Sit out after sunset, cook in the full kitchen, and sleep well behind double-glazed windows. A favourite with couples and with guests visiting family in Enugu.",
    propertyType: "ONE_BED",
    address: "Podium Court, Transekulu, Enugu",
    lat: 6.4505,
    lng: 7.5236,
    pricePerNight: 42000,
    weekendPrice: 50000,
    weeklyDiscount: 12,
    monthlyDiscount: 25,
    cleaningFee: 7000,
    cautionFee: 30000,
    minNights: 1,
    maxNights: 60,
    maxGuests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    cancellationPolicy: "MODERATE",
    isInstantBook: true,
    isFeatured: false,
    amenitySlugs: ["wifi", "power", "ac", "tv", "kitchen", "washer", "balcony", "parking", "security", "water"],
    images: [PHOTO_POOL.living[2], PHOTO_POOL.bedroom[3], PHOTO_POOL.kitchen[1], PHOTO_POOL.bath[1], PHOTO_POOL.exterior[3]],
    gateCode: "4821",
    wifiName: "Podium-Terrace",
    wifiPassword: "welcome-podium-4",
    arrivalNotes: arrival("The apartment is on the second floor, door 6."),
  },
  {
    slug: "garden-court-two-bed",
    title: "Garden Court Two-Bed",
    tagline: "Two bedrooms, two bathrooms, and room for everyone's luggage.",
    description:
      "Two proper bedrooms, each with its own air conditioner, and a living room big enough for the whole group to sit together. Ideal for friends travelling together, small families and colleagues on a project. The kitchen is stocked for real cooking.",
    propertyType: "TWO_BED",
    address: "Podium Court, Transekulu, Enugu",
    lat: 6.4511,
    lng: 7.5219,
    pricePerNight: 45000,
    weekendPrice: 55000,
    weeklyDiscount: 12,
    monthlyDiscount: 28,
    cleaningFee: 10000,
    cautionFee: 40000,
    minNights: 1,
    maxNights: 60,
    maxGuests: 4,
    bedrooms: 2,
    beds: 3,
    bathrooms: 2,
    cancellationPolicy: "MODERATE",
    isInstantBook: true,
    isFeatured: true,
    amenitySlugs: ["wifi", "power", "ac", "tv", "kitchen", "washer", "parking", "security", "water", "workspace", "housekeeping"],
    images: [PHOTO_POOL.living[4], PHOTO_POOL.bedroom[0], PHOTO_POOL.bedroom[1], PHOTO_POOL.kitchen[2], PHOTO_POOL.bath[0], PHOTO_POOL.exterior[4]],
    gateCode: "4821",
    wifiName: "Podium-Garden",
    wifiPassword: "welcome-podium-5",
    arrivalNotes: arrival("The apartment is on the ground floor with its own entrance facing the garden."),
  },
  {
    slug: "skyline-two-bed",
    title: "Skyline Two-Bed",
    tagline: "A high-floor two-bedroom with the best view in the compound.",
    description:
      "Sitting on the top floor, this two-bedroom has wide windows over Transekulu and a balcony that is hard to leave. Premium bedding, a coffee machine and a quiet corridor make it our most requested two-bedroom for longer stays.",
    propertyType: "TWO_BED",
    address: "Podium Court, Transekulu, Enugu",
    lat: 6.4498,
    lng: 7.5215,
    pricePerNight: 50000,
    weekendPrice: 60000,
    weeklyDiscount: 12,
    monthlyDiscount: 28,
    cleaningFee: 10000,
    cautionFee: 40000,
    minNights: 1,
    maxNights: 60,
    maxGuests: 4,
    bedrooms: 2,
    beds: 3,
    bathrooms: 2,
    cancellationPolicy: "MODERATE",
    isInstantBook: false,
    isFeatured: true,
    amenitySlugs: ["wifi", "power", "ac", "tv", "kitchen", "washer", "balcony", "parking", "security", "water", "workspace", "housekeeping"],
    images: [PHOTO_POOL.living[5], PHOTO_POOL.bedroom[2], PHOTO_POOL.bedroom[3], PHOTO_POOL.kitchen[0], PHOTO_POOL.bath[1], PHOTO_POOL.exterior[5]],
    gateCode: "4821",
    wifiName: "Podium-Skyline",
    wifiPassword: "welcome-podium-6",
    arrivalNotes: arrival("The apartment is on the third floor. The lift is next to the main door."),
  },
  {
    slug: "family-three-bed",
    title: "The Family Three-Bed",
    tagline: "Three bedrooms for the whole family, with a kitchen built for Sunday.",
    description:
      "Three bedrooms, three bathrooms and a large open kitchen and dining area. Made for family visits, weddings and extended stays when everyone wants to be under one roof. There is a children's play corner and enough parking for two cars.",
    propertyType: "THREE_BED",
    address: "Podium Court, Transekulu, Enugu",
    lat: 6.4516,
    lng: 7.5233,
    pricePerNight: 55000,
    weekendPrice: 65000,
    weeklyDiscount: 15,
    monthlyDiscount: 30,
    cleaningFee: 12000,
    cautionFee: 50000,
    minNights: 2,
    maxNights: 60,
    maxGuests: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: 3,
    cancellationPolicy: "STRICT",
    isInstantBook: false,
    isFeatured: false,
    amenitySlugs: ["wifi", "power", "ac", "tv", "kitchen", "washer", "parking", "security", "water", "housekeeping"],
    images: [PHOTO_POOL.living[0], PHOTO_POOL.bedroom[1], PHOTO_POOL.bedroom[0], PHOTO_POOL.kitchen[1], PHOTO_POOL.bath[0], PHOTO_POOL.exterior[0]],
    gateCode: "4821",
    wifiName: "Podium-Family",
    wifiPassword: "welcome-podium-7",
    arrivalNotes: arrival("The apartment is on the second floor, doors 8 and 9 (they open into one home)."),
  },
  {
    slug: "podium-penthouse",
    title: "The Podium Penthouse",
    tagline: "The whole top floor, with a terrace that looks over Enugu.",
    description:
      "Our best address. A full-floor penthouse with a long terrace, a spacious living and dining room, a master suite with a freestanding tub, and a kitchen you will want to cook in. Private lift access, a dedicated host and flexible check-in make this the one for anniversaries, executives and anyone who wants the very best of Transekulu.",
    propertyType: "PENTHOUSE",
    address: "Podium Court, Transekulu, Enugu",
    lat: 6.4496,
    lng: 7.5229,
    pricePerNight: 63000,
    weekendPrice: 75000,
    weeklyDiscount: 15,
    monthlyDiscount: 30,
    cleaningFee: 15000,
    cautionFee: 60000,
    minNights: 2,
    maxNights: 60,
    maxGuests: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: 3,
    cancellationPolicy: "STRICT",
    isInstantBook: false,
    isFeatured: true,
    amenitySlugs: ["wifi", "power", "ac", "tv", "kitchen", "washer", "balcony", "parking", "security", "water", "workspace", "housekeeping"],
    images: [PHOTO_POOL.exterior[3], PHOTO_POOL.living[3], PHOTO_POOL.bedroom[2], PHOTO_POOL.kitchen[2], PHOTO_POOL.bath[1], PHOTO_POOL.living[5]],
    gateCode: "4821",
    wifiName: "Podium-Penthouse",
    wifiPassword: "welcome-podium-8",
    arrivalNotes: arrival("Take the private lift to the top floor; your host will be waiting there."),
  },
];

export const SAMPLE_SEASONAL = [
  { name: "Christmas and New Year", startDate: "2026-12-20", endDate: "2027-01-05", multiplier: 1.4 },
];

export const SAMPLE_COUPONS = [
  { code: "WELCOME10", description: "10% off your first stay", type: "PERCENT" as const, value: 10, minNights: 2 },
  { code: "STAY5K", description: "₦5,000 off any stay of 3 nights or more", type: "FIXED" as const, value: 5000, minNights: 3 },
];

// Placeholder feedback so the testimonials section has something to show before real reviews exist.
export const SAMPLE_REVIEWS = [
  { slug: "executive-one-bed", name: "Chinedu O.", rating: 5, comment: "Power never dropped once in five nights and the Wi-Fi handled all my video calls. It felt like a home, not a hotel room.", reply: "Thank you Chinedu, we will keep the lights on for your next visit." },
  { slug: "skyline-two-bed", name: "Amaka E.", rating: 5, comment: "We came as a group of four for a wedding. Two bathrooms saved the morning, and the view from the balcony was a bonus.", reply: null },
  { slug: "podium-penthouse", name: "Tunde A.", rating: 5, comment: "The penthouse is the real deal. Spotless, quiet, and the host sorted our late check-in without any fuss.", reply: null },
  { slug: "garden-court-two-bed", name: "Ngozi M.", rating: 4, comment: "Great value for two bedrooms. The kitchen had everything we needed to cook jollof for the family.", reply: null },
  { slug: "podium-studio-two", name: "Ifeanyi K.", rating: 5, comment: "Booked for a week on a work assignment. The desk and the weekly discount made it an easy choice.", reply: null },
  { slug: "terrace-one-bed", name: "Blessing U.", rating: 5, comment: "Checked in at midnight and the security team already had my name. The terrace in the evening is lovely.", reply: null },
];

export const DEFAULT_RESERVATION_NOTES = baseRules;
export const BASE_HOUSE_RULES = baseRules;
