"use client";

import { useI18n } from "@/components/LanguageProvider";
import { navItems, navLabel } from "@/lib/categories";
import { isHomePath, normalizePathname } from "@/lib/paths";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function CategoryNavigation() {
  const pathname = normalizePathname(usePathname() || "/");
  const { t, locale } = useI18n();

  return (
    <nav className="cat-nav" aria-label={t("a11y.mainCategories")}>
      <div className="wrap cat-nav-scroll">
        <ul>
          {navItems.map((item) => {
            const href = normalizePathname(item.href);
            const active = isHomePath(item.href)
              ? isHomePath(pathname)
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={item.slug}>
                <Link
                  href={item.href}
                  className="cat-link"
                  aria-current={active ? "page" : undefined}
                >
                  {navLabel(item, locale)}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
