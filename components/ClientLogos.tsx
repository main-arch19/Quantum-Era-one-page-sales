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
import powerConcepts from "@/public/clients/power-concepts.png";
import phersonsKellan from "@/public/clients/phersons-kellan.png";

/**
 * The client roster — ten clients, each in its own colours.
 *
 * Every mark ships in its real brand colours, trimmed and sized but never
 * recoloured. That reverses an earlier decision: they were flattened to one
 * navy ink so seven unrelated palettes would not read as a sticker sheet on a
 * two-colour page. Showing real client marks in their real colours buys
 * recognition and authenticity, and spends visual coherence. That is a
 * deliberate trade, not an oversight.
 *
 * The bordered cell is what pays for it. With no shared ink left, the frame is
 * the only thing grouping the row — one brand per cell, and the three type
 * wordmarks sit in an identical frame so the row does not split into seven
 * pictures and three leftovers.
 *
 * Three sources (Vivid Walls, Sannovia, Nykefah) ship a painted-in white
 * background rather than transparency. Those are keyed by FLOOD FILL from the
 * edges, never by luminance. Luminance keying was safe when the output was a
 * flat silhouette — every surviving pixel got overwritten anyway — but on full
 * colour it punches holes through the white counters inside Vivid Walls
 * lettering and through Sannovia's white-filled lotus. Verified against a
 * checkerboard before shipping.
 *
 * Three clients have no mark that survives at roster size and are set in type
 * instead; see the note on TRUST_LINE in lib/content.ts for which and why.
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
  "Power Concepts": powerConcepts,
  "Pherson's Kellan Estates": phersonsKellan,
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

  // One container for every mark, image and wordmark alike. Giving the boxes
  // only to the logos would split the row visually in two — seven framed
  // things and three loose ones — which is exactly the "images plus
  // leftovers" reading the type treatment exists to avoid.
  const cell =
    "flex h-[4.5rem] items-center justify-center rounded-card border border-line bg-white px-5";

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {TRUST_LINE.map((mark) => {
        const art = mark.kind === "logo" ? ART[mark.name] : undefined;

        // A named logo with no artwork would silently vanish from the roster.
        // Fall through to the wordmark so the client is still named.
        if (mark.kind === "logo" && art) {
          const height = Math.round(base * mark.opticalScale);
          const width = Math.round((art.width / art.height) * height);

          return (
            <li key={mark.name} className={cell}>
              <Image
                src={art}
                alt={mark.name}
                width={width}
                height={height}
                // Below the fold at every width. Nothing here competes with
                // the hero for the LCP.
                // Full opacity. Dimming a brand colour does not read as
                // restraint the way dimming a single ink did — it reads as
                // faded artwork, and a client's mark shown faded is worse
                // than not showing it at all.
                loading="lazy"
                className="max-w-full object-contain"
              />
            </li>
          );
        }

        return (
          <li key={mark.name} className={cell}>
            <span
              className="text-balance text-center font-display text-sm font-bold leading-tight tracking-[-0.01em] text-navy"
            >
              {mark.name}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
