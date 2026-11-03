"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { ApiError, resolveMediaUrl } from "@/lib/api";
import {
  createAdminArticle,
  deleteAdminMedia,
  fetchAdminArticle,
  fetchAdminCategories,
  fetchAdminMedia,
  publishAdminArticle,
  scheduleAdminArticle,
  updateAdminArticle,
  uploadAdminMedia,
} from "@/lib/admin/api";
import { makePublicId, slugify } from "@/lib/admin/slug";
import type {
  AdminCategory,
  AdminContentBlock,
  AdminMedia,
  AdminTranslation,
  ArticleStatus,
  ArticleWritePayload,
} from "@/lib/admin/types";
import { assertImageWithinLimit } from "@/lib/admin/upload";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";

function emptyTranslation(languageCode: "hi" | "en"): AdminTranslation {
  return {
    languageCode,
    slug: "",
    title: "",
    summary: "",
    authorDisplayName: "Miracle Times Desk",
    imageAlt: "",
    imageCaption: "",
    imagePosition: "center",
    seoTitle: "",
    seoDescription: "",
    content: [{ type: "p", text: "" }],
  };
}

function toDatetimeLocalValue(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function ArticleEditor({ articleId }: { articleId?: number }) {
  const router = useRouter();
  const isEdit = typeof articleId === "number";
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [media, setMedia] = useState<AdminMedia[]>([]);
  const [langTab, setLangTab] = useState<"hi" | "en">("hi");

  const [publicId, setPublicId] = useState(() => makePublicId("story"));
  const [status, setStatus] = useState<ArticleStatus>("draft");
  const [featured, setFeatured] = useState(false);
  const [breaking, setBreaking] = useState(false);
  const [featuredImageId, setFeaturedImageId] = useState<number | null>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [tagsText, setTagsText] = useState("");
  const [publishedAtLocal, setPublishedAtLocal] = useState("");
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [hi, setHi] = useState<AdminTranslation>(() => emptyTranslation("hi"));
  const [en, setEn] = useState<AdminTranslation>(() => emptyTranslation("en"));

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchAdminCategories(),
      fetchAdminMedia({ page: 1, limit: 24 }),
    ])
      .then(([cats, mediaResult]) => {
        if (cancelled) return;
        setCategories(cats);
        setMedia(mediaResult.media);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load categories or media.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEdit || !articleId) return;
    let cancelled = false;
    setLoading(true);
    fetchAdminArticle(articleId)
      .then((article) => {
        if (cancelled) return;
        setPublicId(article.publicId);
        setStatus(article.status);
        setFeatured(article.featured);
        setBreaking(article.breaking);
        setFeaturedImageId(article.featuredImageId ?? null);
        setFeaturedImageUrl(
          article.featuredImageUrl
            ? resolveMediaUrl(article.featuredImageUrl)
            : null,
        );
        setCategoryIds(article.categories.map((item) => item.id));
        setTagsText((article.tags || []).join(", "));
        setPublishedAtLocal(toDatetimeLocalValue(article.publishedAt));
        setScheduledAtLocal(toDatetimeLocalValue(article.scheduledAt));
        const hiTranslation =
          article.translations.find((item) => item.languageCode === "hi") ||
          emptyTranslation("hi");
        const enTranslation =
          article.translations.find((item) => item.languageCode === "en") ||
          emptyTranslation("en");
        setHi({
          ...hiTranslation,
          content: hiTranslation.content.length
            ? hiTranslation.content
            : [{ type: "p", text: "" }],
        });
        setEn({
          ...enTranslation,
          content: enTranslation.content.length
            ? enTranslation.content
            : [{ type: "p", text: "" }],
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Unable to load article.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [articleId, isEdit]);

  const active = langTab === "hi" ? hi : en;
  const setActive = langTab === "hi" ? setHi : setEn;

  const previewHref = useMemo(() => {
    const slug = (langTab === "hi" ? hi.slug : en.slug).trim();
    return slug ? `/news/${slug}/` : null;
  }, [langTab, hi.slug, en.slug]);

  function updateTranslation(
    patch: Partial<AdminTranslation>,
    options?: { syncSlug?: boolean },
  ) {
    setActive((current) => {
      const next = { ...current, ...patch };
      if (options?.syncSlug && patch.title && !isEdit) {
        next.slug = slugify(patch.title);
      }
      return next;
    });
  }

  function updateBlock(index: number, patch: Partial<AdminContentBlock>) {
    setActive((current) => ({
      ...current,
      content: current.content.map((block, i) =>
        i === index ? { ...block, ...patch } : block,
      ),
    }));
  }

  function addBlock(type: "p" | "h2") {
    setActive((current) => ({
      ...current,
      content: [...current.content, { type, text: "" }],
    }));
  }

  function removeBlock(index: number) {
    setActive((current) => ({
      ...current,
      content:
        current.content.length <= 1
          ? current.content
          : current.content.filter((_, i) => i !== index),
    }));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setActive((current) => {
      const next = [...current.content];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return { ...current, content: next };
    });
  }

  function buildPayload(nextStatus: ArticleStatus): ArticleWritePayload {
    const tags = tagsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const normalizeTranslation = (item: AdminTranslation): AdminTranslation => ({
      languageCode: item.languageCode,
      slug: item.slug.trim(),
      title: item.title.trim(),
      summary: item.summary.trim(),
      authorDisplayName: item.authorDisplayName?.trim() || null,
      imageAlt: item.imageAlt || "",
      imageCaption: item.imageCaption || null,
      imagePosition: item.imagePosition || "center",
      seoTitle: item.seoTitle || null,
      seoDescription: item.seoDescription || null,
      content: item.content
        .map((block) => ({ type: block.type, text: block.text.trim() }))
        .filter((block) => block.text.length > 0),
    });

    return {
      publicId: publicId.trim(),
      status: nextStatus,
      featured,
      breaking,
      featuredImageId,
      publishedAt: fromDatetimeLocalValue(publishedAtLocal),
      scheduledAt: fromDatetimeLocalValue(scheduledAtLocal),
      categoryIds,
      tags,
      translations: [normalizeTranslation(hi), normalizeTranslation(en)],
    };
  }

  function validatePayload(payload: ArticleWritePayload) {
    if (!payload.publicId) return "Public ID is required.";
    if (!payload.categoryIds?.length) return "Select at least one category.";
    for (const translation of payload.translations) {
      if (!translation.title || !translation.slug || !translation.summary) {
        return `Complete title, slug, and summary for ${translation.languageCode}.`;
      }
      if (!translation.content.length) {
        return `Add at least one content block for ${translation.languageCode}.`;
      }
    }
    if (payload.status === "scheduled" && !payload.scheduledAt) {
      return "Scheduled articles need a schedule date.";
    }
    return null;
  }

  async function save(nextStatus: ArticleStatus) {
    setError(null);
    setMessage(null);
    const payload = buildPayload(nextStatus);
    const validationError = validatePayload(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      if (isEdit && articleId) {
        const updated = await updateAdminArticle(articleId, payload);
        setStatus(updated.status);
        setMessage(
          nextStatus === "draft"
            ? "Draft saved."
            : `Article saved as ${updated.status}.`,
        );
      } else {
        const created = await createAdminArticle(payload);
        setMessage("Article created.");
        router.replace(`/admin/articles/edit/?id=${created.id}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save article.");
    } finally {
      setSaving(false);
    }
  }

  async function publishNow() {
    if (!isEdit || !articleId) {
      await save("published");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateAdminArticle(articleId, buildPayload("draft"));
      await publishAdminArticle(
        articleId,
        fromDatetimeLocalValue(publishedAtLocal) || undefined,
      );
      setStatus("published");
      setMessage("Article published.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Publish failed.");
    } finally {
      setSaving(false);
    }
  }

  async function scheduleNow() {
    const scheduledAt = fromDatetimeLocalValue(scheduledAtLocal);
    if (!scheduledAt) {
      setError("Choose a schedule date before scheduling.");
      return;
    }
    if (!isEdit || !articleId) {
      await save("scheduled");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateAdminArticle(articleId, buildPayload("draft"));
      await scheduleAdminArticle(articleId, scheduledAt);
      setStatus("scheduled");
      setMessage("Article scheduled.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Schedule failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onUpload(file: File | null) {
    if (!file || uploadingImage) return;
    setError(null);
    setMessage(null);
    setUploadingImage(true);
    try {
      assertImageWithinLimit(file);
      const uploaded = await uploadAdminMedia(file);
      setMedia((current) => [uploaded, ...current]);
      setFeaturedImageId(uploaded.id);
      setFeaturedImageUrl(uploaded.fileUrl);
      setMessage("Image uploaded and selected.");
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Upload failed.",
      );
    } finally {
      setUploadingImage(false);
    }
  }

  function onDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    if (event.dataTransfer.types.includes("Files")) {
      setDragActive(true);
    }
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setDragActive(false);
    }
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setDragActive(false);
    const file = event.dataTransfer.files?.[0] || null;
    void onUpload(file);
  }

  function toggleCategory(id: number) {
    setCategoryIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <AdminShell
      title={isEdit ? "Edit article" : "New article"}
      subtitle="Bilingual Hindi / English editorial form"
      actions={
        <>
          {previewHref ? (
            <a
              className="admin-btn"
              href={previewHref}
              target="_blank"
              rel="noreferrer"
            >
              Preview
            </a>
          ) : null}
          <Link className="admin-btn" href="/admin/articles/">
            Back to list
          </Link>
        </>
      }
    >
      {error ? <div className="admin-alert error">{error}</div> : null}
      {message ? <div className="admin-alert success">{message}</div> : null}
      {loading ? (
        <div className="admin-alert info">Loading article…</div>
      ) : (
        <form
          className="admin-stack"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void save(status === "published" ? "published" : "draft");
          }}
        >
          <div className="admin-card admin-card-pad admin-form-grid two">
            <div>
              <label className="admin-label" htmlFor="public-id">
                Public ID
              </label>
              <input
                id="public-id"
                className="admin-field"
                value={publicId}
                onChange={(event) => setPublicId(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                className="admin-select"
                value={status}
                onChange={(event) => setStatus(event.target.value as ArticleStatus)}
              >
                <option value="draft">draft</option>
                <option value="scheduled">scheduled</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div>
              <label className="admin-label" htmlFor="published-at">
                Published at
              </label>
              <input
                id="published-at"
                className="admin-field"
                type="datetime-local"
                value={publishedAtLocal}
                onChange={(event) => setPublishedAtLocal(event.target.value)}
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="scheduled-at">
                Scheduled at
              </label>
              <input
                id="scheduled-at"
                className="admin-field"
                type="datetime-local"
                value={scheduledAtLocal}
                onChange={(event) => setScheduledAtLocal(event.target.value)}
              />
            </div>
            <div className="admin-check-row">
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(event) => setFeatured(event.target.checked)}
                />
                Featured
              </label>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={breaking}
                  onChange={(event) => setBreaking(event.target.checked)}
                />
                Breaking
              </label>
            </div>
            <div>
              <label className="admin-label" htmlFor="tags">
                Tags (comma separated)
              </label>
              <input
                id="tags"
                className="admin-field"
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
              />
            </div>
          </div>

          <div className="admin-card admin-card-pad">
            <strong>Categories</strong>
            <div className="admin-check-row" style={{ marginTop: 12 }}>
              {categories.map((category) => {
                const label =
                  category.translations.find((item) => item.languageCode === "en")
                    ?.name ||
                  category.translations[0]?.name ||
                  category.slug;
                return (
                  <label key={category.id} className="admin-check">
                    <input
                      type="checkbox"
                      checked={categoryIds.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="admin-card admin-card-pad">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <strong>Featured image</strong>
              <button
                type="button"
                className="admin-btn"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingImage ? "Uploading…" : "Upload image"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                hidden
                onChange={(event) => {
                  void onUpload(event.target.files?.[0] || null);
                  event.target.value = "";
                }}
              />
            </div>
            <div
              className={`admin-dropzone ${dragActive ? "is-active" : ""} ${
                featuredImageUrl ? "has-preview" : ""
              }`}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDragOver={onDragOver}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
              aria-label="Drop an image here or use Upload image"
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              {featuredImageUrl ? (
                <div className="admin-dropzone-preview">
                  <div className="admin-dropzone-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={featuredImageUrl} alt="Selected featured" />
                    <button
                      type="button"
                      className="admin-image-remove"
                      aria-label="Remove selected image"
                      title="Remove selected image"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setFeaturedImageId(null);
                        setFeaturedImageUrl(null);
                        setMessage("Featured image removed.");
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div className="admin-dropzone-copy">
                    <strong>Featured image selected</strong>
                    <span>Media #{featuredImageId}</span>
                    <span>Drop a new image here to replace it</span>
                  </div>
                </div>
              ) : (
                <div className="admin-dropzone-copy">
                  <strong>
                    {dragActive ? "Drop image to upload" : "Drag & drop an image"}
                  </strong>
                  <span>or use the Upload image button</span>
                  <span>Max size 1 MB · JPEG, PNG, WebP, or AVIF</span>
                </div>
              )}
            </div>
            <div className="admin-media-grid" style={{ marginTop: 14 }}>
              {media.map((item) => {
                const selected = featuredImageId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`admin-media-item ${selected ? "is-selected" : ""}`}
                  >
                    <button
                      type="button"
                      className="admin-media-select"
                      onClick={() => {
                        setFeaturedImageId(item.id);
                        setFeaturedImageUrl(item.fileUrl);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.fileUrl}
                        alt={item.originalFilename || ""}
                      />
                    </button>
                    <button
                      type="button"
                      className="admin-image-remove"
                      aria-label="Remove image"
                      title="Remove image"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void (async () => {
                          try {
                            await deleteAdminMedia(item.id);
                            setMedia((current) =>
                              current.filter((entry) => entry.id !== item.id),
                            );
                            if (featuredImageId === item.id) {
                              setFeaturedImageId(null);
                              setFeaturedImageUrl(null);
                            }
                            setMessage("Image removed.");
                            setError(null);
                          } catch (err) {
                            setError(
                              err instanceof ApiError
                                ? err.message
                                : "Could not remove image.",
                            );
                          }
                        })();
                      }}
                    >
                      ×
                    </button>
                    <div className="admin-media-meta">#{item.id}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="admin-tabs">
            <button
              type="button"
              className={`admin-tab ${langTab === "hi" ? "is-active" : ""}`}
              onClick={() => setLangTab("hi")}
            >
              Hindi
            </button>
            <button
              type="button"
              className={`admin-tab ${langTab === "en" ? "is-active" : ""}`}
              onClick={() => setLangTab("en")}
            >
              English
            </button>
          </div>

          <div className="admin-card admin-card-pad admin-form-grid two">
            <div>
              <label className="admin-label">Title ({langTab})</label>
              <input
                className="admin-field"
                value={active.title}
                onChange={(event) =>
                  updateTranslation(
                    { title: event.target.value },
                    { syncSlug: true },
                  )
                }
                required
              />
            </div>
            <div>
              <label className="admin-label">Slug ({langTab})</label>
              <input
                className="admin-field"
                value={active.slug}
                onChange={(event) =>
                  updateTranslation({ slug: slugify(event.target.value) })
                }
                required
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="admin-label">Summary</label>
              <textarea
                className="admin-textarea"
                value={active.summary}
                onChange={(event) =>
                  updateTranslation({ summary: event.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="admin-label">Author display name</label>
              <input
                className="admin-field"
                value={active.authorDisplayName || ""}
                onChange={(event) =>
                  updateTranslation({ authorDisplayName: event.target.value })
                }
              />
            </div>
            <div>
              <label className="admin-label">Image position</label>
              <input
                className="admin-field"
                value={active.imagePosition || "center"}
                onChange={(event) =>
                  updateTranslation({ imagePosition: event.target.value })
                }
              />
            </div>
            <div>
              <label className="admin-label">Image alt</label>
              <input
                className="admin-field"
                value={active.imageAlt || ""}
                onChange={(event) =>
                  updateTranslation({ imageAlt: event.target.value })
                }
              />
            </div>
            <div>
              <label className="admin-label">Image caption</label>
              <input
                className="admin-field"
                value={active.imageCaption || ""}
                onChange={(event) =>
                  updateTranslation({ imageCaption: event.target.value })
                }
              />
            </div>
            <div>
              <label className="admin-label">SEO title</label>
              <input
                className="admin-field"
                value={active.seoTitle || ""}
                onChange={(event) =>
                  updateTranslation({ seoTitle: event.target.value })
                }
              />
            </div>
            <div>
              <label className="admin-label">SEO description</label>
              <input
                className="admin-field"
                value={active.seoDescription || ""}
                onChange={(event) =>
                  updateTranslation({ seoDescription: event.target.value })
                }
              />
            </div>
          </div>

          <div className="admin-card admin-card-pad">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <strong>Content blocks ({langTab})</strong>
              <div className="admin-actions">
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => addBlock("p")}
                >
                  Add paragraph
                </button>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => addBlock("h2")}
                >
                  Add heading
                </button>
              </div>
            </div>
            <div className="admin-block-list">
              {active.content.map((block, index) => (
                <div className="admin-block" key={`${langTab}-${index}`}>
                  <div className="admin-block-head">
                    <select
                      className="admin-select"
                      style={{ maxWidth: 160 }}
                      value={block.type}
                      onChange={(event) =>
                        updateBlock(index, {
                          type: event.target.value as "p" | "h2",
                        })
                      }
                    >
                      <option value="p">Paragraph</option>
                      <option value="h2">Heading</option>
                    </select>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => moveBlock(index, -1)}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => moveBlock(index, 1)}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        onClick={() => removeBlock(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="admin-textarea"
                    value={block.text}
                    onChange={(event) =>
                      updateBlock(index, { text: event.target.value })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="admin-actions">
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={saving}
              onClick={() => void save("draft")}
            >
              Save draft
            </button>
            <button
              type="button"
              className="admin-btn"
              disabled={saving}
              onClick={() => void publishNow()}
            >
              Publish now
            </button>
            <button
              type="button"
              className="admin-btn"
              disabled={saving}
              onClick={() => void scheduleNow()}
            >
              Schedule
            </button>
            <button
              type="button"
              className="admin-btn"
              disabled={saving}
              onClick={() => void save(status)}
            >
              Save with current status
            </button>
          </div>
        </form>
      )}
    </AdminShell>
  );
}
