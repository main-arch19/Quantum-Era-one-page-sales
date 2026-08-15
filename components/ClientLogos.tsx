import Image, { type StaticImageData } from "next/image";
import { TRUST_LINE } from "@/lib/content";

// Static imports, not "/clients/x.png" strings. basePath is set on this app,
// and the image optimizer rejects a bare public path with a 400 because it
// never sees the prefix. A static import also gives Next the intrinsic width
// and height at build time, which is what holds CLS at zero.
import parafount from "@/public/clients/parafount.png";
import sharkbox from "@/public/clients/sharkbox.png";
import vividwalls from "@/public/clients/vividwalls.png";
import sannovia from "@/public/clients/sannovia.png";
import jcam from "@/public/clients/jcam.png";
import nykefah from "@/public/clients/nykefah.png";
import extreme from "@/public/clients/extreme.png";

/**
 * The client roster — ten clients, one ink.
 *
 * Every mark is flattened to Quantum Navy before it ever reaches the repo, so
 * the files on disk are already one colour: no runtime filter, no colour to
 * manage. That is not a stylistic preference. The seven sources ship seven
 * unrelated palettes — red, orange, teal, green, a blue-to-orange gradient,
 * forest green, black script — and dropped in raw they turn the one section
 * meant to read as evidence into a sticker sheet, on a page whose entire
 * colour system is two colours and a warning.
 *
 * Three clients have no mark that survives that treatment and are set in type
 * instead; see the note on TRUST_LINE in lib/content.ts for which and why.
 * Both kinds carry the same ink and the same opacity so the row reads as one
 * roster rather than as images plus leftovers.
 *
 * NO LINKS. Not on the images, not on the type, not around either.
 */

const ART: Record<string, StaticImageData> = {
  Parafount: parafount,
  "Shark Box": sharkbox,
  "Vivid Walls": vividwalls,
  "Sannovia Skincare": sannovia,
  "Jamaica Centre for Advanced Medicine": jcam,
  "Nykefah Nairne": nykefah,
  "Shop Extreme JA on Wheels": extreme,
};

/** Row height in px before each logo's optical correction. */
const BASE_HEIGHT = 30;

/**
 * `prominent` is for the case where this row is the only thing in the proof
 * section — with no proof story written yet, an eyebrow over a footnote reads
 * as a section that failed to load rather than one being quiet on purpose.
 *
 * The multiplier is small on purpose. Ten marks carry a section by count; the
 * same lift that suited five would make this one enormous.
 */
export function ClientLogos({ prominent = false }: { prominent?: boolean }) {
  const base = prominent ? BASE_HEIGHT * 1.1 : BASE_HEIGHT;
  const opacity = prominent ? "opacity-90" : "opacity-75";

  return (
    <ul className="flex flex-wrap items-center gap-x-9 gap-y-6 sm:gap-x-12">
      {TRUST_LINE.map((mark) => {
        const art = mark.kind === "logo" ? ART[mark.name] : undefined;

        // A named logo with no artwork would silently vanish from the roster.
        // Fall through to the wordmark so the client is still named.
        if (mark.kind === "logo" && art) {
          const height = Math.round(base * mark.opticalScale);
          const width = Math.round((art.width / art.height) * height);

          return (
            <li key={mark.name}>
              <Image
                src={art}
                alt={mark.name}
                width={width}
                height={height}
                // Below the fold at every width. Nothing here competes with
                // the hero for the LCP.
                loading="lazy"
                className={opacity}
              />
            </li>
          );
        }

        return (
          <li
            key={mark.name}
            className={`font-display text-base font-bold tracking-[-0.01em] text-navy ${opacity}`}
          >
            {mark.name}
          </li>
        );
      })}
    </ul>
  );
}
