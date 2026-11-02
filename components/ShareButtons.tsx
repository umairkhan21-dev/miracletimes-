"use client";

import { LinkIcon, ShareIcon } from "@/components/Icons";
import { useT } from "@/components/LanguageProvider";
import { useEffect, useState } from "react";

export function ShareButtons({
  title,
  summary,
  path,
}: {
  title: string;
  summary: string;
  path: string;
}) {
  const t = useT();
  const [url, setUrl] = useState(path);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage(t("article.copied"));
    } catch {
      setMessage(t("article.copyFailed", { url }));
    }
  }

  async function share() {
    const payload = { title, text: summary, url };
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(payload);
        setMessage("");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyLink();
  }

  return (
    <div className="share-tools">
      <button type="button" className="btn" onClick={share}>
        <ShareIcon />
        {t("article.share")}
      </button>
      <button type="button" className="btn" onClick={copyLink}>
        <LinkIcon />
        {t("article.copyLink")}
      </button>
      <p className="share-status" role="status">
        {message}
      </p>
    </div>
  );
}
