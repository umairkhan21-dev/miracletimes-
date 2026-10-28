"use client";

import { navItems } from "@/lib/categories";
import { DEMO_BASE, isDemoHomePath, normalizePathname } from "@/lib/paths";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function CategoryNavigation() {
  const pathname = normalizePathname(usePathname() || DEMO_BASE);

  return (
    <nav className="cat-nav" aria-label="प्रमुख श्रेणियाँ">
      <div className="wrap cat-nav-scroll">
        <ul>
          {navItems.map((item) => {
            const href = normalizePathname(item.href);
            const active = isDemoHomePath(item.href)
              ? isDemoHomePath(pathname)
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={item.slug}>
                <Link
                  href={item.href}
                  className="cat-link"
                  aria-current={active ? "page" : undefined}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
