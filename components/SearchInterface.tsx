"use client";

import { ArticleList } from "@/components/ArticleList";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { SearchIcon } from "@/components/Icons";
import { useI18n } from "@/components/LanguageProvider";
import { ApiError } from "@/lib/api";
import { categories, navLabel } from "@/lib/categories";
import { searchArticlesRemote } from "@/lib/content";
import { demoPath } from "@/lib/paths";
import type { Article } from "@/lib/types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export function SearchInterface() {
  const { t, locale } = useI18n();
  const params = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState("");
  const [results, setResults] = useState<Article[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );

  useEffect(() => {
    setMounted(true);
    setValue(params.get("q") ?? "");
  }, [params]);

  const query = mounted ? (params.get("q") ?? "") : "";

  useEffect(() => {
    if (!mounted) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    searchArticlesRemote(locale, trimmed)
      .then((articles) => {
        if (cancelled) return;
        setResults(articles);
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(
          error instanceof ApiError ? error.message : "Search failed",
        );
        setResults([]);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [mounted, query, locale]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = value.trim();
    router.push(
      next
        ? `${demoPath("/search")}?q=${encodeURIComponent(next)}`
        : demoPath("/search"),
    );
  }

  function clear() {
    setValue("");
    router.push(demoPath("/search"));
  }

  return (
    <div className="wrap page-block search-page">
      <Breadcrumbs
        items={[
          { label: t("nav.home"), href: demoPath("/") },
          { label: t("nav.search") },
        ]}
      />
      <header className="page-intro">
        <h1>{t("search.title")}</h1>
        <p>{t("search.intro")}</p>
      </header>
      <form className="search-box" role="search" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="search-q">
          {t("search.label")}
        </label>
        <input
          id="search-q"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("search.placeholder")}
          autoComplete="off"
          enterKeyHint="search"
        />
        <button type="submit" className="btn btn-red">
          <SearchIcon />
          {t("search.submit")}
        </button>
        {query || value ? (
          <button type="button" className="btn" onClick={clear}>
            {t("search.clear")}
          </button>
        ) : null}
      </form>

      {!query.trim() ? (
        <div className="search-hint">
          <p>{t("search.hint")}</p>
          <ul className="cat-pills">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={category.href}>{navLabel(category, locale)}</Link>
              </li>
            ))}
          </ul>
        </div>
      ) : status === "loading" ? (
        <p className="feed-note" role="status" aria-live="polite">
          {t("content.loading")}
        </p>
      ) : status === "error" ? (
        <EmptyState
          title={t("content.unavailableTitle")}
          message={t("content.unavailableMessage")}
          action={{ href: demoPath("/"), label: t("category.goHome") }}
        />
      ) : results.length ? (
        <section aria-live="polite">
          <h2 className="feed-heading">
            {t("search.results", {
              count: results.length,
              query: query.trim(),
            })}
          </h2>
          <ArticleList articles={results} variant="row" />
        </section>
      ) : (
        <EmptyState
          title={t("search.emptyTitle")}
          message={t("search.emptyMessage", { query: query.trim() })}
          action={{ href: demoPath("/"), label: t("category.goHome") }}
        />
      )}
    </div>
  );
}
