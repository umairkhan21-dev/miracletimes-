import { MastheadSearch } from "@/components/MastheadSearch";
import { demoPath } from "@/lib/paths";
import { site } from "@/lib/site";
import Image from "next/image";
import Link from "next/link";

export function BrandMasthead() {
  return (
    <div className="masthead">
      <div className="wrap masthead-inner">
        <Link href={demoPath("/")} className="brand-lockup">
          <span className="brand-mark">
            <Image
              className="brand-logo"
              src="/mark.png"
              alt=""
              width={183}
              height={101}
              priority
            />
          </span>
          <span className="brand-text">
            <span className="brand-name">{site.name}</span>
            <span className="brand-tag">{site.tagline}</span>
          </span>
        </Link>
        <MastheadSearch />
      </div>
    </div>
  );
}
