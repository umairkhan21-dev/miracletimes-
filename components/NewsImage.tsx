"use client";

import Image from "next/image";
import { useState } from "react";

type NewsImageProps = {
  src?: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  position?: string;
};

export function NewsImage({
  src,
  alt,
  priority = false,
  sizes = "(max-width: 720px) 100vw, 720px",
  position = "center",
}: NewsImageProps) {
  const [failed, setFailed] = useState(!src);

  if (failed || !src) {
    return <div className="media-fallback" role="img" aria-label={alt} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className="media-img"
      style={{ objectPosition: position }}
      onError={() => setFailed(true)}
    />
  );
}
