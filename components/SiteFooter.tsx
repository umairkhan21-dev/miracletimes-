import { categories, infoLinks } from "@/lib/categories";
import { demoPath } from "@/lib/paths";
import { site } from "@/lib/site";
import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
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
              <span className="brand-tag">{site.tagline}</span>
            </span>
          </Link>
          <p>
            मिरेकल टाइम्स उत्तर प्रदेश और लखनऊ को केंद्र में रखकर देश, राजनीति,
            कारोबार और रोजमर्रा की खबरें हिंदी में पढ़ने का अखबार है। इस संस्करण की
            कहानियाँ नमूना सामग्री हैं।
          </p>
        </div>
        <nav aria-label="श्रेणियाँ">
          <h2>श्रेणियाँ</h2>
          <ul>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={category.href}>{category.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="संस्थान">
          <h2>संस्थान</h2>
          <ul>
            {infoLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
            <li>
              <a href={demoPath("/feed.xml")}>आरएसएस फ़ीड</a>
            </li>
            <li>
              <Link href="/">डेमो से बाहर</Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="wrap footer-base">
        <p>© {new Date().getFullYear()} Miracle Times. सर्वाधिकार सुरक्षित।</p>
        <p>लखनऊ, उत्तर प्रदेश</p>
      </div>
    </footer>
  );
}
