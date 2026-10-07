"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { Home } from "lucide-react";

// Wraps next/image so a missing or slow photo never leaves a broken-image icon on the page.
export function SafeImage({ className = "", alt, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br from-mist to-mist-deep text-ink-faint ${props.fill ? "absolute inset-0" : ""} ${className}`}
      >
        <Home size={28} strokeWidth={1.4} />
      </div>
    );
  }

  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image {...props} alt={alt} className={className} onError={() => setFailed(true)} />;
}
