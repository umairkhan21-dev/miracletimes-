"use client";

import { ApiError } from "@/lib/api";
import { useAdminAuth } from "@/lib/admin/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const { status, isAdmin, login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      router.replace("/admin/");
    }
  }, [isAdmin, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace("/admin/");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to sign in. Check your credentials and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || isAdmin) {
    return (
      <div className="admin-app">
        <div className="admin-login-page">
          <div className="admin-card admin-login-card">
            <p className="admin-muted">Preparing administrator login…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-app">
      <div className="admin-login-page">
        <form className="admin-card admin-login-card" onSubmit={onSubmit}>
          <div className="admin-brand" style={{ marginBottom: 18, color: "inherit" }}>
            <Image src="/mark.png" alt="" width={52} height={29} />
            <div>
              <strong style={{ color: "#1c1915" }}>Miracle Times</strong>
              <span style={{ color: "#6b645a" }}>Administrator sign-in</span>
            </div>
          </div>
          <h1>Newsroom access</h1>
          <p>Sign in with the existing administrator account. Registration is disabled.</p>
          {error ? <div className="admin-alert error">{error}</div> : null}
          <div className="admin-stack">
            <div>
              <label className="admin-label" htmlFor="admin-email">
                Email
              </label>
              <input
                id="admin-email"
                className="admin-field"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="admin-password">
                Password
              </label>
              <input
                id="admin-password"
                className="admin-field"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <button
              className="admin-btn admin-btn-primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
