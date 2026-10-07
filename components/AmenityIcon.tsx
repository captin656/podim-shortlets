import {
  Wifi,
  Zap,
  Snowflake,
  Tv,
  CookingPot,
  WashingMachine,
  Car,
  ShieldCheck,
  Droplets,
  Laptop,
  Sun,
  Sparkles,
  Check,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  zap: Zap,
  snowflake: Snowflake,
  tv: Tv,
  "cooking-pot": CookingPot,
  "washing-machine": WashingMachine,
  car: Car,
  "shield-check": ShieldCheck,
  droplets: Droplets,
  laptop: Laptop,
  sun: Sun,
  sparkles: Sparkles,
};

export const AMENITY_ICON_KEYS = Object.keys(ICONS);

export function AmenityIcon({ name, size = 22 }: { name: string; size?: number }) {
  const Icon = ICONS[name] ?? Check;
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" />;
}
