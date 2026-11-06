"use client";

import { useI18n } from "@/components/LanguageProvider";
import { categories, infoLinks, navLabel } from "@/lib/categories";
import { demoPath } from "@/lib/paths";
import { site } from "@/lib/site";
import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  const { t, locale } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Link href={demoPath("/")} className="footer-lockup">
            <span className="brand-mark">
              <Image className="brand-logo" src="/mark.png" alt="" width={183} height={101} />
            </span>
            <span>
              <span className="brand-name">{site.name}</span>
              <span className="brand-tag">{t("brand.tagline")}</span>
            </span>
          </Link>
          <p>{t("brand.footerAbout")}</p>
        </div>
        <nav aria-label={t("a11y.categories")}>
          <h2>{t("footer.categories")}</h2>
          <ul>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={category.href}>{navLabel(category, locale)}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t("a11y.institution")}>
          <h2>{t("footer.institution")}</h2>
          <ul>
            {infoLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{t(link.labelKey)}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="wrap footer-base">
        <p>{t("brand.copyright", { year })}</p>
        <p>{site.address}</p>
      </div>
    </footer>
  );
}
