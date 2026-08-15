import Image, { type StaticImageData } from "next/image";
import { TRUST_LINE } from "@/lib/content";

// Static imports, not "/clients/x.png" strings. basePath is set on this app,
// and the image optimizer rejects a bare public path with a 400 because it
// never sees the prefix. A static import also gives Next the intrinsic width
// and height at build time, which is what holds CLS at zero.
import parafount from "@/public/clients/parafount.png";
import sharkbox from "@/public/clients/sharkbox.png";
import vividwalls from "@/public/clients/vividwalls.png";
import jcam from "@/public/clients/jcam.png";
import extreme from "@/public/clients/extreme.png";

/**
 * The client roster, as artwork.
 *
 * Every mark is flattened to Quantum Navy before it ever reaches the repo —
 * the files on disk are already one ink, so there is no runtime filter and no
 * colour to manage. That is not a stylistic preference: these five logos ship
 * five unrelated palettes (red, orange, teal, green, and a blue-to-orange
 * gradient), and dropped in raw they turn the one section that is supposed to
 * read as evidence into a sticker sheet, on a page whose entire colour system
 * is two colours and a warning.
 *
 * NO LINKS. Not on the images, not around them.
 */

const ART: Record<string, StaticImageData> = {
  Parafount: parafount,
  "Shark Box": sharkbox,
  "Vivid Walls": vividwalls,
  "Jamaica Centre for Advanced Medicine": jcam,
  "Shop Extreme JA on Wheels": extreme,
};

/** Row height in px before each logo's optical correction. */
const BASE_HEIGHT = 30;

/**
 * `prominent` is for the case where this row is the only thing in the proof
 * section — with no proof story written yet, an eyebrow over a footnote reads
 * as a section that failed to load rather than one being quiet on purpose.
 */
export function ClientLogos({ prominent = false }: { prominent?: boolean }) {
  const base = prominent ? BASE_HEIGHT * 1.35 : BASE_HEIGHT;

  return (
    <ul className="flex flex-wrap items-center gap-x-10 gap-y-7 sm:gap-x-14">
      {TRUST_LINE.map(({ name, opticalScale }) => {
        const art = ART[name];
        if (!art) return null;

        const height = Math.round(base * opticalScale);
        const width = Math.round((art.width / art.height) * height);

        return (
          <li key={name}>
            <Image
              src={art}
              alt={name}
              width={width}
              height={height}
              // Below the fold on every viewport. Nothing here competes with
              // the hero for the LCP.
              loading="lazy"
              // The artwork is already navy; this is only to sit the roster
              // just behind the copy that earns it.
              className={prominent ? "opacity-90" : "opacity-75"}
            />
          </li>
        );
      })}
    </ul>
  );
}
