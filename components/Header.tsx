import Image from "next/image";
import { COMPANY } from "@/lib/content";
// Static import, not a "/qes-logo.png" string: with basePath set, the image
// optimizer never sees the prefix on a bare public path and rejects it (400).
// A static import resolves to a hashed, immutably-cached /_next/static asset
// that works on both sides of the edge rewrite.
import logo from "@/public/qes-logo.png";

/**
 * No navigation. No menu. No home link. No phone number.
 *
 * The logo is an image and nothing more — it is deliberately NOT wrapped in an
 * anchor. On a paid landing page a clickable logo is the single most expensive
 * leak there is, because it is the one people click by reflex.
 *
 * The number that used to sit on the right is gone on purpose. It could not be
 * answered reliably during working hours, and a number that rings out is worse
 * than no number on a page whose whole argument is that slow response loses
 * business. The header is the logo, and that is all.
 */
export function Header() {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-6xl items-center px-5 py-4 sm:px-8">
        <Image
          src={logo}
          alt={COMPANY.name}
          priority
          sizes="120px"
          className="h-8 w-auto sm:h-9"
        />
      </div>
    </header>
  );
}
