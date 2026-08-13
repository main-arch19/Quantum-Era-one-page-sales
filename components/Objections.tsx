import { OBJECTIONS } from "@/lib/content";

/**
 * Native <details>/<summary>. No JavaScript, no hydration cost, keyboard
 * accessible and screen-reader correct by default. An accordion is not worth
 * a client bundle.
 */
export function Objections() {
  return (
    <div className="divide-y divide-line border-y border-line">
      {OBJECTIONS.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex items-start justify-between gap-4 py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy">
            <h3 className="font-display text-[1.0625rem] font-bold leading-snug text-navy sm:text-lg">
              {item.q}
            </h3>
            <span
              aria-hidden="true"
              className="accordion-icon mt-1 shrink-0 text-ink/40 transition-transform duration-200"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 2v12M2 8h12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </summary>
          <p className="max-w-2xl pb-6 text-[1.0625rem] text-ink/75">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}
