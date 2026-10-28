"use client";

import { LinkIcon, ShareIcon } from "@/components/Icons";
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
  const [url, setUrl] = useState(path);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("लिंक कॉपी हो गया");
    } catch {
      setMessage(`लिंक कॉपी नहीं हो सका। इसे चुनकर कॉपी करें: ${url}`);
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
        साझा करें
      </button>
      <button type="button" className="btn" onClick={copyLink}>
        <LinkIcon />
        लिंक कॉपी करें
      </button>
      <p className="share-status" role="status">
        {message}
      </p>
    </div>
  );
}
