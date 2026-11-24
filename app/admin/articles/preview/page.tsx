"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { ArticlePreviewView } from "@/components/admin/ArticlePreviewView";
import { ApiError } from "@/lib/api";
import { fetchAdminArticle } from "@/lib/admin/api";
import { adminArticleToPreviewArticle } from "@/lib/admin/previewMap";
import type { AdminArticle } from "@/lib/admin/types";
import type { Locale } from "@/lib/i18n/config";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function parseLocale(raw: string | null): Locale | null {
  if (raw === "hi" || raw === "en") return raw;
  return null;
}

function PreviewInner() {
  const params = useSearchParams();
  const rawId = params.get("id");
  const id = rawId ? Number(rawId) : NaN;
  const preferredLang = parseLocale(params.get("lang"));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [article, setArticle] = useState<AdminArticle | null>(null);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      setError("Provide a valid article id, for example /admin/articles/preview/?id=1");
      setArticle(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAdminArticle(id)
      .then((data) => {
        if (cancelled) return;
        setArticle(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setArticle(null);
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load article for preview.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const mapped = useMemo(() => {
    if (!article) return null;
    return adminArticleToPreviewArticle(article, preferredLang);
  }, [article, preferredLang]);

  const availableLanguages = useMemo(() => {
    if (!article) return [] as Locale[];
    return article.translations
      .map((item) => item.languageCode)
      .filter((code): code is Locale => code === "hi" || code === "en");
  }, [article]);

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <AdminShell title="Article preview" subtitle="Missing article id">
        <div className="admin-alert error">
          Provide a valid article id in the URL, for example{" "}
          <code>/admin/articles/preview/?id=1</code>.
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Article preview"
      subtitle="Private admin view — drafts are not public"
      actions={
        <>
          {availableLanguages.length > 1
            ? availableLanguages.map((code) => {
                const active =
                  (mapped?.language || preferredLang || "hi") === code;
                return (
                  <Link
                    key={code}
                    className={`admin-btn admin-btn-sm${active ? "" : " admin-btn-ghost"}`}
                    href={`/admin/articles/preview/?id=${id}&lang=${code}`}
                  >
                    {code === "hi" ? "Hindi" : "English"}
                  </Link>
                );
              })
            : null}
          <Link
            className="admin-btn"
            href={`/admin/articles/edit/?id=${id}`}
          >
            Edit
          </Link>
          <Link className="admin-btn" href="/admin/articles/">
            Back to list
          </Link>
        </>
      }
    >
      {loading ? (
        <div className="admin-alert info">Loading preview…</div>
      ) : null}
      {error ? <div className="admin-alert error">{error}</div> : null}
      {!loading && !error && !mapped ? (
        <div className="admin-alert error">
          This article needs at least a title and slug before it can be
          previewed.
        </div>
      ) : null}
      {!loading && !error && article && mapped ? (
        <ArticlePreviewView
          article={mapped.article}
          language={mapped.language}
          status={article.status}
          articleId={article.id}
        />
      ) : null}
    </AdminShell>
  );
}

export default function AdminArticlePreviewPage() {
  return (
    <Suspense
      fallback={
        <AdminShell title="Article preview">
          <div className="admin-alert info">Loading preview…</div>
        </AdminShell>
      }
    >
      <PreviewInner />
    </Suspense>
  );
}
