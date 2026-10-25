import { BURGER_BODY_PATH, ICON_VIEWBOX, SPARKLE_ORIGIN, SPARKLE_PATH, SPARKLE_VIEWBOX } from "./paths";

type BurgerMarkProps = {
  className?: string;
  /** Hace titilar el destello (respeta prefers-reduced-motion). */
  twinkle?: boolean;
  title?: string;
};

/** La hamburguesa del logo oficial, con el destello como pieza aparte. */
export function BurgerMark({ className, twinkle = false, title }: BurgerMarkProps) {
  return (
    <svg
      viewBox={ICON_VIEWBOX}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="currentColor"
    >
      <path fillRule="evenodd" d={BURGER_BODY_PATH} />
      <path
        fillRule="evenodd"
        d={SPARKLE_PATH}
        className={twinkle ? "fulgor-twinkle" : undefined}
        style={{ transformOrigin: SPARKLE_ORIGIN, transformBox: "view-box" }}
      />
    </svg>
  );
}

/** Solo el destello: se usa como marca de cada cupo. */
export function SparkleMark({ className, filled = true }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox={SPARKLE_VIEWBOX} className={className} aria-hidden fill="currentColor">
      {filled ? (
        <path d={SPARKLE_PATH.split("M").filter(Boolean).slice(0, 1).map((p) => `M${p}`).join("")} />
      ) : (
        <path fillRule="evenodd" d={SPARKLE_PATH} />
      )}
    </svg>
  );
}
