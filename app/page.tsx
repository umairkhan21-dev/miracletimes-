import type { Metadata } from "next";
import "./coming-soon.css";

export const metadata: Metadata = {
  title: { absolute: "Miracle Times — Coming Soon" },
  description: "Miracle Times is on the way. The first edition is being prepared.",
  applicationName: "Miracle Times",
  openGraph: {
    title: "Miracle Times — Coming Soon",
    description: "Miracle Times is on the way. The first edition is being prepared.",
    type: "website",
    url: "/",
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function ComingSoonPage() {
  return (
    <div className="coming-soon">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- matches original coming-soon CDN fonts; avoids build-time next/font fetch */}
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,560;1,9..144,500&family=Outfit:wght@300;400;500&display=swap"
        rel="stylesheet"
      />
      <div className="coming-soon-grain" aria-hidden="true" />
      <div className="coming-soon-page">
        <header className="coming-soon-header">
          {/* eslint-disable-next-line @next/next/no-img-element -- match original coming-soon markup */}
          <img className="coming-soon-mark" src="/mark.png" alt="Miracle Times" />
          <span className="coming-soon-status">
            <i className="coming-soon-dot" aria-hidden="true" /> Preparing
          </span>
          <span>2026</span>
        </header>

        <main className="coming-soon-main">
          <p className="coming-soon-kicker">A new publication</p>
          <h1 className="coming-soon-title">
            Miracle
            <em>Times</em>
          </h1>
          <div className="coming-soon-rules" aria-hidden="true">
            <span />
            <span />
          </div>
          <p className="coming-soon-soon">Coming soon</p>
          <p className="coming-soon-lede">
            The first edition is being prepared. Check back shortly.
          </p>
        </main>

        <footer className="coming-soon-footer">
          <span>First edition</span>
          <span>Miracle Times</span>
          <span>On the way</span>
        </footer>
      </div>
    </div>
  );
}
