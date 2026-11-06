"use client";

import { SearchIcon } from "@/components/Icons";
import { useT } from "@/components/LanguageProvider";
import { demoPath } from "@/lib/paths";
import { useEffect, useId, useRef, useState } from "react";

export function MastheadSearch() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formId = useId();

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={`mast-search${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="icon-btn search-toggle"
        aria-expanded={open}
        aria-controls={formId}
        onClick={() => setOpen((value) => !value)}
      >
        <SearchIcon />
        <span className="sr-only">
          {open ? t("a11y.searchClose") : t("a11y.searchOpen")}
        </span>
      </button>
      <form
        id={formId}
        className="search-form"
        action={`${demoPath("/search")}/`}
        method="get"
        role="search"
      >
        <label className="sr-only" htmlFor="site-query">
          {t("search.mastheadLabel")}
        </label>
        <input
          ref={inputRef}
          id="site-query"
          name="q"
          type="search"
          placeholder={t("search.mastheadPlaceholder")}
          autoComplete="off"
          enterKeyHint="search"
        />
      </form>
    </div>
  );
}
