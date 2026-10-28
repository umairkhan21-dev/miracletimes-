"use client";

import { ArticleList } from "@/components/ArticleList";
import { Pagination } from "@/components/Pagination";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Article } from "@/lib/types";

export function PagedArticleList({
  articles,
  pageSize = 6,
}: {
  articles: Article[];
  pageSize?: number;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const requested = mounted ? Number(params.get("page") || "1") : 1;
  const pageCount = Math.max(1, Math.ceil(articles.length / pageSize));
  const page = Number.isFinite(requested)
    ? Math.min(Math.max(1, Math.trunc(requested)), pageCount)
    : 1;
  const start = (page - 1) * pageSize;
  const visible = articles.slice(start, start + pageSize);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("article-feed")?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [page]);

  function onPage(next: number) {
    const search = new URLSearchParams(params.toString());
    if (next <= 1) search.delete("page");
    else search.set("page", String(next));
    const query = search.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  if (!articles.length) {
    return <p className="feed-note">इस सूची में अभी और खबरें नहीं हैं।</p>;
  }

  return (
    <div id="article-feed">
      <ArticleList articles={visible} variant="row" />
      <Pagination page={page} pageCount={pageCount} onPage={onPage} />
    </div>
  );
}
