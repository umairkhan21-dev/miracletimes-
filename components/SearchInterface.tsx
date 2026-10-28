"use client";

import { ArticleList } from "@/components/ArticleList";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { SearchIcon } from "@/components/Icons";
import { categories } from "@/lib/categories";
import { searchArticles } from "@/lib/content";
import { demoPath } from "@/lib/paths";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export function SearchInterface() {
  const params = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState("");
  useEffect(() => {
    setMounted(true);
    setValue(params.get("q") ?? "");
  }, [params]);
  const query = mounted ? (params.get("q") ?? "") : "";
  const results = query.trim() ? searchArticles(query) : [];

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
      <Breadcrumbs items={[{ label: "होम", href: demoPath("/") }, { label: "खोज" }]} />
      <header className="page-intro">
        <h1>खबरें खोजें</h1>
        <p>
          हिंदी या अंग्रेज़ी में शीर्षक, सार और खबर का पाठ खोजें। नतीजे स्थानीय नमूना
          संग्रह से आते हैं।
        </p>
      </header>
      <form className="search-box" role="search" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="search-q">
          खोज शब्द
        </label>
        <input
          id="search-q"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="जैसे लखनऊ, शिक्षा, cricket"
          autoComplete="off"
          enterKeyHint="search"
        />
        <button type="submit" className="btn btn-red">
          <SearchIcon />
          खोजें
        </button>
        {query || value ? (
          <button type="button" className="btn" onClick={clear}>
            साफ करें
          </button>
        ) : null}
      </form>

      {!query.trim() ? (
        <div className="search-hint">
          <p>कोई शब्द लिखें। इन श्रेणियों से भी शुरू कर सकते हैं:</p>
          <ul className="cat-pills">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={category.href}>{category.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      ) : results.length ? (
        <section aria-live="polite">
          <h2 className="feed-heading">
            {results.length} नतीजे “{query.trim()}” के लिए
          </h2>
          <ArticleList articles={results} variant="row" />
        </section>
      ) : (
        <EmptyState
          title="कोई नतीजा नहीं मिला"
          message={`“${query.trim()}” से कोई नमूना खबर नहीं मिली। दूसरा शब्द आज़माएँ या श्रेणी खोलें।`}
          action={{ href: demoPath("/"), label: "होम पर जाएँ" }}
        />
      )}
    </div>
  );
}
