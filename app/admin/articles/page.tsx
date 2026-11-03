"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { ApiError } from "@/lib/api";
import {
  archiveAdminArticle,
  deleteAdminArticle,
  fetchAdminArticles,
  publishAdminArticle,
  scheduleAdminArticle,
  updateAdminArticle,
} from "@/lib/admin/api";
import type { AdminArticleListItem, ArticleStatus } from "@/lib/admin/types";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

const STATUSES: Array<ArticleStatus | ""> = [
  "",
  "draft",
  "scheduled",
  "published",
  "archived",
];

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<AdminArticleListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<ArticleStatus | "">("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"hi" | "en">("hi");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminArticles({
        page,
        limit: 20,
        status,
        language,
        q: query || undefined,
      });
      setArticles(result.articles);
      setTotalPages(result.meta?.totalPages ?? 1);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to load articles.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, status, language, query]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(q.trim());
  }

  async function runAction(
    id: number,
    action: () => Promise<unknown>,
    success: string,
  ) {
    setBusyId(id);
    setMessage(null);
    setError(null);
    try {
      await action();
      setMessage(success);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell
      title="Articles"
      subtitle="Create, edit, publish, and schedule stories"
      actions={
        <Link className="admin-btn admin-btn-primary" href="/admin/articles/new/">
          New article
        </Link>
      }
    >
      {error ? <div className="admin-alert error">{error}</div> : null}
      {message ? <div className="admin-alert success">{message}</div> : null}

      <form className="admin-toolbar" onSubmit={onSearch}>
        <input
          className="admin-field"
          style={{ maxWidth: 280 }}
          placeholder="Search title, slug, or keyword"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <select
          className="admin-select"
          style={{ maxWidth: 180 }}
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as ArticleStatus | "");
          }}
        >
          {STATUSES.map((item) => (
            <option key={item || "all"} value={item}>
              {item ? item : "All statuses"}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          style={{ maxWidth: 160 }}
          value={language}
          onChange={(event) => {
            setPage(1);
            setLanguage(event.target.value as "hi" | "en");
          }}
        >
          <option value="hi">Hindi titles</option>
          <option value="en">English titles</option>
        </select>
        <button className="admin-btn" type="submit">
          Search
        </button>
      </form>

      <div className="admin-card">
        {loading ? (
          <div className="admin-empty">Loading articles…</div>
        ) : articles.length === 0 ? (
          <div className="admin-empty">No articles match these filters.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Language</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Author</th>
                  <th>Published</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => {
                  const id = article.numericId;
                  const previewSlug = article.slug;
                  return (
                    <tr key={`${article.id}-${article.language}-${article.slug}`}>
                      <td>
                        <strong>{article.title}</strong>
                        <div className="admin-muted">{article.slug}</div>
                      </td>
                      <td>{article.language || language}</td>
                      <td>{article.category || "—"}</td>
                      <td>
                        <span className={`admin-badge ${article.status || "draft"}`}>
                          {article.status || "draft"}
                        </span>
                      </td>
                      <td>{article.author}</td>
                      <td>
                        {article.publishedAt
                          ? new Date(article.publishedAt).toLocaleString()
                          : "—"}
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          {id ? (
                            <Link
                              className="admin-btn"
                              href={`/admin/articles/edit/?id=${id}`}
                            >
                              Edit
                            </Link>
                          ) : null}
                          {previewSlug ? (
                            <a
                              className="admin-btn"
                              href={`/news/${previewSlug}/`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Preview
                            </a>
                          ) : null}
                          {id && article.status !== "published" ? (
                            <button
                              type="button"
                              className="admin-btn"
                              disabled={busyId === id}
                              onClick={() => {
                                if (!confirm("Publish this article now?")) return;
                                void runAction(
                                  id,
                                  () => publishAdminArticle(id),
                                  "Article published.",
                                );
                              }}
                            >
                              Publish
                            </button>
                          ) : null}
                          {id && article.status === "published" ? (
                            <button
                              type="button"
                              className="admin-btn"
                              disabled={busyId === id}
                              onClick={() => {
                                if (!confirm("Move this article back to draft?")) return;
                                void runAction(
                                  id,
                                  () => updateAdminArticle(id, { status: "draft" }),
                                  "Article unpublished to draft.",
                                );
                              }}
                            >
                              Unpublish
                            </button>
                          ) : null}
                          {id && article.status !== "scheduled" ? (
                            <button
                              type="button"
                              className="admin-btn"
                              disabled={busyId === id}
                              onClick={() => {
                                const value = window.prompt(
                                  "Schedule for (ISO datetime, e.g. 2026-11-05T10:00:00.000Z)",
                                );
                                if (!value) return;
                                void runAction(
                                  id,
                                  () => scheduleAdminArticle(id, value),
                                  "Article scheduled.",
                                );
                              }}
                            >
                              Schedule
                            </button>
                          ) : null}
                          {id && article.status !== "archived" ? (
                            <button
                              type="button"
                              className="admin-btn"
                              disabled={busyId === id}
                              onClick={() => {
                                if (!confirm("Archive this article?")) return;
                                void runAction(
                                  id,
                                  () => archiveAdminArticle(id),
                                  "Article archived.",
                                );
                              }}
                            >
                              Archive
                            </button>
                          ) : null}
                          {id ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn-danger"
                              disabled={busyId === id}
                              onClick={() => {
                                if (
                                  !confirm(
                                    "Delete this article permanently? This cannot be undone.",
                                  )
                                ) {
                                  return;
                                }
                                void runAction(
                                  id,
                                  () => deleteAdminArticle(id),
                                  "Article deleted.",
                                );
                              }}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-actions" style={{ marginTop: 16 }}>
        <button
          type="button"
          className="admin-btn"
          disabled={page <= 1 || loading}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
        >
          Previous
        </button>
        <span className="admin-muted">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="admin-btn"
          disabled={page >= totalPages || loading}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </button>
      </div>
    </AdminShell>
  );
}
