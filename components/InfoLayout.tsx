import { Breadcrumbs } from "@/components/Breadcrumbs";
import { demoPath } from "@/lib/paths";
import type { ReactNode } from "react";

export function InfoLayout({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <article className="wrap info-page">
      <Breadcrumbs items={[{ label: "होम", href: demoPath("/") }, { label: title }]} />
      <header className="page-intro">
        <h1>{title}</h1>
        <p>{lede}</p>
      </header>
      <div className="info-body">{children}</div>
    </article>
  );
}
