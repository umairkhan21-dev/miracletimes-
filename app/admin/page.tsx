"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { ApiError } from "@/lib/api";
import {
  fetchAdminArticles,
  fetchArticleStatusCounts,
} from "@/lib/admin/api";
import type { AdminArticleListItem } from "@/lib/admin/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [recent, setRecent] = useState<AdminArticleListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchArticleStatusCounts(),
      fetchAdminArticles({ page: 1, limit: 6, language: "hi" }),
    ])
      .then(([nextCounts, list]) => {
        if (cancelled) return;
        setCounts(nextCounts);
        setRecent(list.articles);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load dashboard statistics.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminShell
      title="Dashboard"
      subtitle="Editorial overview for Miracle Times"
      actions={
        <>
          <Link className="admin-btn admin-btn-primary" href="/admin/articles/new/">
            New article
          </Link>
          <Link className="admin-btn" href="/admin/articles/">
            View articles
          </Link>
          <Link className="admin-btn" href="/admin/categories/">
            Categories
          </Link>
        </>
      }
    >
      {error ? <div className="admin-alert error">{error}</div> : null}
      {loading ? (
        <div className="admin-alert info">Loading dashboard…</div>
      ) : (
        <>
          <div className="admin-grid stats" style={{ marginBottom: 18 }}>
            {[
              ["total", "Total articles"],
              ["published", "Published"],
              ["draft", "Drafts"],
              ["scheduled", "Scheduled"],
            ].map(([key, label]) => (
              <div key={key} className="admin-card admin-stat">
                <span>{label}</span>
                <strong>{counts?.[key] ?? 0}</strong>
              </div>
            ))}
          </div>

          <div className="admin-card">
            <div className="admin-card-pad" style={{ borderBottom: "1px solid #ddd4c5" }}>
              <strong>Recent articles</strong>
            </div>
            {recent.length === 0 ? (
              <div className="admin-empty">No articles yet. Create the first draft.</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Category</th>
                      <th>Updated</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((article) => {
                      const id = article.numericId;
                      return (
                        <tr key={`${article.id}-${article.slug}`}>
                          <td>
                            <strong>{article.title}</strong>
                            <div className="admin-muted">{article.slug}</div>
                          </td>
                          <td>
                            <span className={`admin-badge ${article.status || "draft"}`}>
                              {article.status || "draft"}
                            </span>
                          </td>
                          <td>{article.category || "—"}</td>
                          <td>
                            {article.updatedAt
                              ? new Date(article.updatedAt).toLocaleString()
                              : "—"}
                          </td>
                          <td>
                            {id ? (
                              <Link
                                className="admin-btn"
                                href={`/admin/articles/edit/?id=${id}`}
                              >
                                Edit
                              </Link>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}
