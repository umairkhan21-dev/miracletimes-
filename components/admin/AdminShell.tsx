"use client";

import { useAdminAuth } from "@/lib/admin/auth";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const NAV = [
  { href: "/admin/", label: "Dashboard" },
  { href: "/admin/articles/", label: "Articles" },
  { href: "/admin/articles/new/", label: "New article" },
  { href: "/admin/categories/", label: "Categories" },
  { href: "/admin/media/", label: "Media" },
];

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
};

function normalize(path: string) {
  if (!path) return "/";
  return path.endsWith("/") ? path : `${path}/`;
}

function AdminClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) {
    return <div className="admin-clock" aria-hidden="true" />;
  }

  return (
    <time className="admin-clock" dateTime={now.toISOString()}>
      <span className="admin-clock-date">
        {now.toLocaleDateString("en-IN", DATE_FORMAT)}
      </span>
      <span className="admin-clock-time">
        {now.toLocaleTimeString("en-IN", TIME_FORMAT)}
      </span>
    </time>
  );
}

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = normalize(usePathname() || "/admin/");
  const router = useRouter();
  const { status, user, isAdmin, logout } = useAdminAuth();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/admin/login/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="admin-app">
        <div className="admin-login-page">
          <div className="admin-card admin-login-card">
            <p className="admin-muted">Checking administrator session…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin || !user) {
    return (
      <div className="admin-app">
        <div className="admin-login-page">
          <div className="admin-card admin-login-card">
            <p className="admin-muted">Redirecting to login…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-app">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <Image src="/mark.png" alt="" width={52} height={31} />
            <div>
              <strong>Miracle Times</strong>
              <span>Newsroom admin</span>
            </div>
          </div>
          <nav className="admin-nav" aria-label="Admin">
            {NAV.map((item) => {
              const active =
                item.href === "/admin/"
                  ? pathname === "/admin/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "is-active" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="admin-sidebar-foot">
            <p>{user.name}</p>
            <small>{user.email}</small>
            <div className="admin-actions">
              <button
                type="button"
                className="admin-btn admin-btn-sm admin-btn-ghost"
                onClick={() => void logout().then(() => router.replace("/admin/login/"))}
              >
                Log out
              </button>
            </div>
          </div>
        </aside>
        <div className="admin-main">
          <header className="admin-topbar">
            <div>
              <h1>{title}</h1>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
            <div className="admin-topbar-end">
              <AdminClock />
              {actions ? <div className="admin-actions">{actions}</div> : null}
            </div>
          </header>
          <div className="admin-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
