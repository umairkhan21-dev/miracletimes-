"use client";

import { EmptyState } from "@/components/EmptyState";
import { demoPath } from "@/lib/paths";

export function ContentLoading({ message }: { message: string }) {
  return (
    <div className="wrap page-block">
      <p className="feed-note" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}

export function ContentUnavailable({
  title,
  message,
  actionLabel,
}: {
  title: string;
  message: string;
  actionLabel: string;
}) {
  return (
    <div className="wrap page-block">
      <EmptyState
        title={title}
        message={message}
        action={{ href: demoPath("/"), label: actionLabel }}
        heading="h1"
      />
    </div>
  );
}
