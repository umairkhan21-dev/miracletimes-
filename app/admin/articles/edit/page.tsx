"use client";

import { ArticleEditor } from "@/components/admin/ArticleEditor";
import { AdminShell } from "@/components/admin/AdminShell";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function EditArticleInner() {
  const params = useSearchParams();
  const raw = params.get("id");
  const id = raw ? Number(raw) : NaN;

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <AdminShell title="Edit article" subtitle="Missing article id">
        <div className="admin-alert error">
          Provide a valid article id in the URL, for example{" "}
          <code>/admin/articles/edit/?id=1</code>.
        </div>
      </AdminShell>
    );
  }

  return <ArticleEditor articleId={id} />;
}

export default function AdminEditArticlePage() {
  return (
    <Suspense
      fallback={
        <AdminShell title="Edit article">
          <div className="admin-alert info">Loading editor…</div>
        </AdminShell>
      }
    >
      <EditArticleInner />
    </Suspense>
  );
}
