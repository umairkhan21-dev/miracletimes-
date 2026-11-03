"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { ApiError } from "@/lib/api";
import {
  deleteAdminMedia,
  fetchAdminMedia,
  registerAdminMediaFromUrl,
  uploadAdminMedia,
} from "@/lib/admin/api";
import type { AdminMedia } from "@/lib/admin/types";
import { assertImageWithinLimit } from "@/lib/admin/upload";
import { FormEvent, useEffect, useState } from "react";

export default function AdminMediaPage() {
  const [media, setMedia] = useState<AdminMedia[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminMedia({ page: nextPage, limit: 24 });
      setMedia(result.media);
      setTotalPages(result.meta?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load media.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function onUpload(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      assertImageWithinLimit(file);
      await uploadAdminMedia(file);
      setMessage("Image uploaded.");
      await load(1);
      setPage(1);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Upload failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onFromUrl(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await registerAdminMediaFromUrl(url.trim());
      setUrl("");
      setMessage("External image registered.");
      await load(1);
      setPage(1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not register URL.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title="Media"
      subtitle="Upload images or register public image URLs"
    >
      {error ? <div className="admin-alert error">{error}</div> : null}
      {message ? <div className="admin-alert success">{message}</div> : null}

      <div className="admin-card admin-card-pad admin-form-grid two">
        <div>
          <label className="admin-label">Upload image</label>
          <input
            className="admin-field"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={busy}
            onChange={(event) => {
              void onUpload(event.target.files?.[0] || null);
              event.target.value = "";
            }}
          />
          <p className="admin-muted" style={{ marginTop: 8 }}>
            Max size 1 MB (JPEG, PNG, WebP, or AVIF).
          </p>
        </div>
        <form onSubmit={onFromUrl}>
          <label className="admin-label">Register from URL</label>
          <div className="admin-actions">
            <input
              className="admin-field"
              placeholder="https://…"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
            />
            <button className="admin-btn admin-btn-primary" type="submit" disabled={busy}>
              Add URL
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card admin-card-pad" style={{ marginTop: 18 }}>
        {loading ? (
          <div className="admin-empty">Loading media…</div>
        ) : media.length === 0 ? (
          <div className="admin-empty">No media uploaded yet.</div>
        ) : (
          <div className="admin-media-grid">
            {media.map((item) => (
              <div key={item.id} className="admin-media-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.fileUrl} alt={item.originalFilename || ""} />
                <div className="admin-media-meta">
                  <div>#{item.id}</div>
                  <div>{item.originalFilename || item.fileUrl}</div>
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      if (!confirm("Delete this media item?")) return;
                      void deleteAdminMedia(item.id)
                        .then(async () => {
                          setMessage("Media deleted.");
                          await load(page);
                        })
                        .catch((err) =>
                          setError(
                            err instanceof ApiError
                              ? err.message
                              : "Delete failed.",
                          ),
                        );
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
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
