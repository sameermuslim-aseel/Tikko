/**
 * تصویرسازی‌های صفحهٔ آموزش.
 * SVG درون‌خطی است تا با تم روشن/تاریک هماهنگ بماند:
 * خطوط از currentColor و تأکیدها از سبز «انجام شد».
 */

const EMERALD = "#10b981";

/** ۰ — خانواده و کد دعوت */
export function HouseholdIllustration() {
  return (
    <svg
      viewBox="0 0 200 160"
      className="h-40 w-full text-foreground"
      fill="none"
      aria-hidden
    >
      {/* خانه */}
      <path
        d="M100 26l46 34v62a6 6 0 01-6 6H60a6 6 0 01-6-6V60l46-34z"
        stroke="currentColor" strokeWidth="3" strokeLinejoin="round"
      />

      {/* دو عضو داخل خانه */}
      <g>
        <circle cx="84" cy="86" r="9" stroke="currentColor" strokeWidth="2.5" />
        <path d="M72 108c1.5-7 6-10.5 12-10.5s10.5 3.5 12 10.5" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g>
        <circle cx="118" cy="86" r="9" fill={EMERALD} opacity="0.85" />
        <path d="M106 108c1.5-7 6-10.5 12-10.5s10.5 3.5 12 10.5" stroke={EMERALD}
          strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* کد دعوت */}
      <rect x="62" y="122" width="76" height="20" rx="10"
        fill="currentColor" opacity="0.08" />
      <g opacity="0.55">
        <rect x="74" y="130" width="10" height="4" rx="2" fill="currentColor" />
        <rect x="88" y="130" width="10" height="4" rx="2" fill="currentColor" />
        <rect x="102" y="130" width="10" height="4" rx="2" fill="currentColor" />
        <rect x="116" y="130" width="10" height="4" rx="2" fill="currentColor" />
      </g>
    </svg>
  );
}

/** ۱ — چک‌لیست امروز داخل قاب موبایل */
export function TodayIllustration() {
  return (
    <svg
      viewBox="0 0 200 160"
      className="h-40 w-full text-foreground"
      fill="none"
      aria-hidden
    >
      {/* قاب موبایل */}
      <rect
        x="58" y="8" width="84" height="144" rx="12"
        stroke="currentColor" strokeWidth="3" opacity="0.9"
      />
      <rect x="88" y="16" width="24" height="4" rx="2" fill="currentColor" opacity="0.3" />

      {/* نوار تاریخ */}
      <g opacity="0.35">
        <rect x="68" y="30" width="14" height="18" rx="4" fill="currentColor" />
        <rect x="86" y="30" width="14" height="18" rx="4" fill="currentColor" />
      </g>
      <rect x="104" y="30" width="14" height="18" rx="4" fill="currentColor" />
      <rect x="122" y="30" width="14" height="18" rx="4" fill="currentColor" opacity="0.35" />

      {/* تسک انجام‌شده */}
      <g>
        <circle cx="128" cy="68" r="7" fill={EMERALD} />
        <path d="M125 68l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
        <rect x="70" y="65" width="48" height="6" rx="3" fill="currentColor" opacity="0.25" />
      </g>

      {/* تسک انجام‌شده */}
      <g>
        <circle cx="128" cy="92" r="7" fill={EMERALD} />
        <path d="M125 92l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
        <rect x="78" y="89" width="40" height="6" rx="3" fill="currentColor" opacity="0.25" />
      </g>

      {/* تسک باقی‌مانده */}
      <g>
        <circle cx="128" cy="116" r="7" stroke="currentColor" strokeWidth="2" opacity="0.5" />
        <rect x="74" y="113" width="44" height="6" rx="3" fill="currentColor" opacity="0.55" />
      </g>
    </svg>
  );
}

/** ۲ — ادمین تسک تکراری تعیین می‌کند */
export function AssignIllustration() {
  return (
    <svg
      viewBox="0 0 200 160"
      className="h-40 w-full text-foreground"
      fill="none"
      aria-hidden
    >
      {/* دو نفر */}
      <g>
        <circle cx="150" cy="44" r="14" stroke="currentColor" strokeWidth="3" />
        <path d="M132 74c2-10 9-15 18-15s16 5 18 15" stroke="currentColor"
          strokeWidth="3" strokeLinecap="round" />
      </g>
      <g opacity="0.55">
        <circle cx="50" cy="44" r="14" stroke="currentColor" strokeWidth="3" />
        <path d="M32 74c2-10 9-15 18-15s16 5 18 15" stroke="currentColor"
          strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* فلش از ادمین به عضو (راست به چپ) */}
      <path d="M124 52H80" stroke={EMERALD} strokeWidth="3" strokeLinecap="round" />
      <path d="M86 46l-7 6 7 6" stroke={EMERALD} strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* چیپ‌های روز هفته */}
      <g>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const active = i === 1 || i === 3 || i === 5;
          return (
            <rect
              key={i}
              x={28 + i * 21} y="104" width="16" height="16" rx="8"
              fill={active ? EMERALD : "currentColor"}
              opacity={active ? 1 : 0.18}
            />
          );
        })}
      </g>

      <rect x="56" y="134" width="88" height="7" rx="3.5" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

/** ۳ — استریک و یادآوری */
export function StreakIllustration() {
  return (
    <svg
      viewBox="0 0 200 160"
      className="h-40 w-full text-foreground"
      fill="none"
      aria-hidden
    >
      {/* ستون‌های رشد */}
      <rect x="40" y="96" width="18" height="34" rx="5" fill="currentColor" opacity="0.2" />
      <rect x="64" y="80" width="18" height="50" rx="5" fill="currentColor" opacity="0.32" />
      <rect x="88" y="62" width="18" height="68" rx="5" fill={EMERALD} opacity="0.55" />
      <rect x="112" y="44" width="18" height="86" rx="5" fill={EMERALD} />

      {/* شعله */}
      <path
        d="M150 30c8 8 12 15 12 23a12 12 0 01-24 0c0-5 3-9 6-13 2 3 4 4 6 4 2-5 1-9 0-14z"
        fill={EMERALD}
      />

      {/* زنگ یادآوری */}
      <g opacity="0.85">
        <path
          d="M52 54c0-7 5-12 12-12s12 5 12 12v9l3 5H49l3-5v-9z"
          stroke="currentColor" strokeWidth="3" strokeLinejoin="round"
        />
        <path d="M60 72a4 4 0 008 0" stroke="currentColor" strokeWidth="3"
          strokeLinecap="round" />
      </g>

      <rect x="36" y="140" width="128" height="7" rx="3.5" fill="currentColor" opacity="0.15" />
    </svg>
  );
}
