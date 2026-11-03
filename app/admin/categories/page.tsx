"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { ApiError } from "@/lib/api";
import {
  createAdminCategory,
  fetchAdminCategories,
  updateAdminCategory,
} from "@/lib/admin/api";
import { slugify } from "@/lib/admin/slug";
import type { AdminCategory } from "@/lib/admin/types";
import { FormEvent, useEffect, useState } from "react";

const emptyForm = {
  slug: "",
  displayOrder: 100,
  isActive: true,
  hiName: "",
  hiDescription: "",
  enName: "",
  enDescription: "",
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setCategories(await fetchAdminCategories());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to load categories.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(category: AdminCategory) {
    const hi = category.translations.find((item) => item.languageCode === "hi");
    const en = category.translations.find((item) => item.languageCode === "en");
    setEditingId(category.id);
    setForm({
      slug: category.slug,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      hiName: hi?.name || "",
      hiDescription: hi?.description || "",
      enName: en?.name || "",
      enDescription: en?.description || "",
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const payload = {
      slug: slugify(form.slug || form.enName || form.hiName),
      displayOrder: Number(form.displayOrder) || 0,
      isActive: form.isActive,
      translations: [
        {
          languageCode: "hi" as const,
          name: form.hiName.trim(),
          description: form.hiDescription.trim(),
        },
        {
          languageCode: "en" as const,
          name: form.enName.trim(),
          description: form.enDescription.trim(),
        },
      ],
    };

    if (
      !payload.slug ||
      !payload.translations.every((item) => item.name && item.description)
    ) {
      setError("Slug and both Hindi/English names and descriptions are required.");
      setSaving(false);
      return;
    }

    try {
      if (editingId) {
        await updateAdminCategory(editingId, payload);
        setMessage("Category updated.");
      } else {
        await createAdminCategory(payload);
        setMessage("Category created.");
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Categories"
      subtitle="Manage bilingual category labels and descriptions"
    >
      {error ? <div className="admin-alert error">{error}</div> : null}
      {message ? <div className="admin-alert success">{message}</div> : null}

      <form className="admin-card admin-card-pad admin-form-grid two" onSubmit={onSubmit}>
        <div>
          <label className="admin-label">Slug</label>
          <input
            className="admin-field"
            value={form.slug}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                slug: slugify(event.target.value),
              }))
            }
          />
        </div>
        <div>
          <label className="admin-label">Display order</label>
          <input
            className="admin-field"
            type="number"
            value={form.displayOrder}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                displayOrder: Number(event.target.value),
              }))
            }
          />
        </div>
        <div>
          <label className="admin-label">Hindi name</label>
          <input
            className="admin-field"
            value={form.hiName}
            onChange={(event) =>
              setForm((current) => ({ ...current, hiName: event.target.value }))
            }
            required
          />
        </div>
        <div>
          <label className="admin-label">English name</label>
          <input
            className="admin-field"
            value={form.enName}
            onChange={(event) =>
              setForm((current) => ({ ...current, enName: event.target.value }))
            }
            required
          />
        </div>
        <div>
          <label className="admin-label">Hindi description</label>
          <textarea
            className="admin-textarea"
            value={form.hiDescription}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                hiDescription: event.target.value,
              }))
            }
            required
          />
        </div>
        <div>
          <label className="admin-label">English description</label>
          <textarea
            className="admin-textarea"
            value={form.enDescription}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                enDescription: event.target.value,
              }))
            }
            required
          />
        </div>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                isActive: event.target.checked,
              }))
            }
          />
          Active
        </label>
        <div className="admin-actions">
          <button className="admin-btn admin-btn-primary" type="submit" disabled={saving}>
            {editingId ? "Update category" : "Create category"}
          </button>
          {editingId ? (
            <button
              type="button"
              className="admin-btn"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="admin-card" style={{ marginTop: 18 }}>
        {loading ? (
          <div className="admin-empty">Loading categories…</div>
        ) : categories.length === 0 ? (
          <div className="admin-empty">No categories yet.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Slug</th>
                  <th>Names</th>
                  <th>Order</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => {
                  const hi = category.translations.find(
                    (item) => item.languageCode === "hi",
                  );
                  const en = category.translations.find(
                    (item) => item.languageCode === "en",
                  );
                  return (
                    <tr key={category.id}>
                      <td>{category.slug}</td>
                      <td>
                        <div>{hi?.name || "—"}</div>
                        <div className="admin-muted">{en?.name || "—"}</div>
                      </td>
                      <td>{category.displayOrder}</td>
                      <td>{category.isActive ? "Yes" : "No"}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn"
                          onClick={() => startEdit(category)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
