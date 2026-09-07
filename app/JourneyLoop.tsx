/**
 * The lifecycle section's artwork. Replaces a generic stock "infinity" render
 * with a diagram that actually states the product's argument: acquisition (the
 * emerald arc) runs once and hands the customer to the retention loop (the gold
 * arc), and both write to the same customer record in the middle.
 *
 * Inline SVG rather than a JPG so it stays crisp on any screen, carries no
 * download weight, and picks up the palette instead of fighting it.
 */
export function JourneyLoop() {
  return (
    <svg
      className="land__loop"
      viewBox="0 0 440 340"
      role="img"
      aria-label="Two customer journeys — acquisition and retention — writing to one shared customer record."
    >
      <defs>
        <linearGradient id="tt-acq" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5fe0c4" />
          <stop offset="100%" stopColor="#1b7a6b" />
        </linearGradient>
        <linearGradient id="tt-ret" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2d98a" />
          <stop offset="100%" stopColor="#c9a227" />
        </linearGradient>
        <radialGradient id="tt-core" cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#16354f" />
          <stop offset="100%" stopColor="#0b1d31" />
        </radialGradient>
        <filter id="tt-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      {/* ambient glows */}
      <ellipse cx="128" cy="150" rx="86" ry="80" fill="#1b7a6b" opacity=".26" filter="url(#tt-soft)" />
      <ellipse cx="312" cy="160" rx="86" ry="80" fill="#c9a227" opacity=".2" filter="url(#tt-soft)" />

      {/* acquisition arc — runs once, left to centre */}
      <path
        d="M40 214 C40 96 96 58 168 58 C224 58 250 96 250 138"
        fill="none" stroke="url(#tt-acq)" strokeWidth="16" strokeLinecap="round"
      />
      {/* retention loop — repeats, right side */}
      <path
        d="M250 202 C250 268 296 296 350 296 C404 296 424 252 424 200 C424 132 386 96 330 96 C286 96 258 122 250 158"
        fill="none" stroke="url(#tt-ret)" strokeWidth="16" strokeLinecap="round"
      />

      {/* travelling pulses */}
      <circle r="6" fill="#eafff8">
        <animateMotion dur="4.5s" repeatCount="indefinite"
          path="M40 214 C40 96 96 58 168 58 C224 58 250 96 250 138" />
        <animate attributeName="opacity" values="0;1;1;0" dur="4.5s" repeatCount="indefinite" />
      </circle>
      <circle r="6" fill="#fff3cf">
        <animateMotion dur="6s" repeatCount="indefinite"
          path="M250 202 C250 268 296 296 350 296 C404 296 424 252 424 200 C424 132 386 96 330 96 C286 96 258 122 250 158" />
      </circle>

      {/* shared customer record */}
      <g>
        <circle cx="250" cy="170" r="52" fill="url(#tt-core)" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" />
        <circle cx="250" cy="170" r="52" fill="none" stroke="#c9a227" strokeWidth="1.5" opacity=".45">
          <animate attributeName="r" values="52;60;52" dur="3.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values=".45;0;.45" dur="3.4s" repeatCount="indefinite" />
        </circle>
        <text x="250" y="163" textAnchor="middle" className="land__loop-core">ONE</text>
        <text x="250" y="184" textAnchor="middle" className="land__loop-core">RECORD</text>
      </g>

      {/* labels */}
      <text x="96" y="248" className="land__loop-label land__loop-label--acq">ACQUIRE</text>
      <text x="96" y="266" className="land__loop-sub">new customers</text>
      <text x="330" y="330" textAnchor="middle" className="land__loop-label land__loop-label--ret">RETAIN &amp; REPEAT</text>
    </svg>
  );
}
