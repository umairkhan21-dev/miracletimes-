import { BrandMasthead } from "@/components/BrandMasthead";
import { CategoryNavigation } from "@/components/CategoryNavigation";
import { CurrentDate } from "@/components/CurrentDate";
import { demoPath } from "@/lib/paths";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="utility">
        <div className="wrap utility-inner">
          <CurrentDate />
          <p className="utility-edition">लखनऊ संस्करण</p>
          <nav className="utility-links" aria-label="उपयोगी कड़ियाँ">
            <Link href={demoPath("/about")}>हमारे बारे में</Link>
            <Link href={demoPath("/contact")}>संपर्क</Link>
            <Link href="/" className="exit-demo-link">
              डेमो से बाहर
            </Link>
          </nav>
        </div>
      </div>
      <BrandMasthead />
      <CategoryNavigation />
    </header>
  );
}
