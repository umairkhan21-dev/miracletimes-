"use client";

import { BrandMasthead } from "@/components/BrandMasthead";
import { CategoryNavigation } from "@/components/CategoryNavigation";
import { CurrentDate } from "@/components/CurrentDate";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useT } from "@/components/LanguageProvider";
import { demoPath } from "@/lib/paths";
import Link from "next/link";

export function SiteHeader() {
  const t = useT();

  return (
    <header className="site-header">
      <div className="utility">
        <div className="wrap utility-inner">
          <div className="utility-start">
            <CurrentDate />
            <p className="utility-edition">{t("brand.edition")}</p>
          </div>
          <div className="utility-end">
            <LanguageSwitcher className="lang-switch--utility" />
            <nav className="utility-links" aria-label={t("a11y.utilityLinks")}>
              <Link href={demoPath("/about")}>{t("nav.about")}</Link>
              <Link href={demoPath("/contact")}>{t("nav.contact")}</Link>
            </nav>
          </div>
        </div>
      </div>
      <BrandMasthead />
      <CategoryNavigation />
    </header>
  );
}
