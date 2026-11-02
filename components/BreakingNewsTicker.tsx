"use client";

import { PauseIcon, PlayIcon } from "@/components/Icons";
import { useT } from "@/components/LanguageProvider";
import { demoPath } from "@/lib/paths";
import Link from "next/link";
import { useState } from "react";

export type TickerItem = { slug: string; title: string };

export function BreakingNewsTicker({ items }: { items: TickerItem[] }) {
  const t = useT();
  const [manualPause, setManualPause] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = manualPause || focused;

  if (!items.length) return null;

  const group = (hidden = false) => (
    <div className="ticker-group" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <Link
          key={`${item.slug}-${hidden ? "b" : "a"}`}
          href={demoPath(`/news/${item.slug}`)}
          className="ticker-item"
        >
          <span className="sample-tag">{t("label.sample")}</span>
          {item.title}
        </Link>
      ))}
    </div>
  );

  return (
    <section
      className="ticker"
      aria-label={t("ticker.breaking")}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div className="wrap ticker-inner">
        <p className="ticker-label">{t("ticker.breaking")}</p>
        <div className="ticker-viewport">
          <div className={`ticker-track${paused ? " is-paused" : ""}`}>
            {group(false)}
            {group(true)}
          </div>
        </div>
        <button
          type="button"
          className="ticker-pause"
          aria-pressed={manualPause}
          onClick={() => setManualPause((value) => !value)}
        >
          {manualPause ? <PlayIcon /> : <PauseIcon />}
          {manualPause ? t("ticker.play") : t("ticker.pause")}
        </button>
      </div>
    </section>
  );
}
