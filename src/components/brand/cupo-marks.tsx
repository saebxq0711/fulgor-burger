import { SparkleMark } from "./burger-mark";

/** Hasta este número de cupos se dibuja un destello por hamburguesa; por encima, una barra. */
export const MAX_MARKS = 40;

type CupoMarksProps = {
  capacity: number;
  remaining: number;
  /** "room" para la página pública (oscura), "paper" para el panel (clara). */
  tone?: "room" | "paper";
  size?: "md" | "sm";
};

/**
 * La tanda a la vista: un destello del logo por cada hamburguesa. Los encendidos están
 * disponibles; los apagados ya tienen dueño. Es decorativo para lectores de pantalla:
 * el número exacto siempre va en texto al lado.
 */
export function CupoMarks({ capacity, remaining, tone = "room", size = "md" }: CupoMarksProps) {
  const lit = tone === "room" ? "text-mustard" : "text-mustard-deep";
  const dim = tone === "room" ? "text-ember" : "text-line-strong";
  const free = Math.max(0, Math.min(capacity, remaining));

  if (capacity > MAX_MARKS || capacity === 0) {
    const ratio = capacity === 0 ? 0 : free / capacity;
    return (
      <div aria-hidden className={`h-3 w-full overflow-hidden rounded-full ${tone === "room" ? "bg-ember" : "bg-tint"}`}>
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-strong)] ${tone === "room" ? "bg-mustard" : "bg-mustard-deep"}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    );
  }

  const markSize = size === "md" ? "size-[clamp(14px,4.2vw,26px)]" : "size-3.5";
  // Filas de 10: la tanda se cuenta de un vistazo (20 = dos filas, nunca 17 + 3).
  const columns = Math.min(10, capacity);
  return (
    <ul
      aria-hidden
      className={`grid w-fit ${size === "md" ? "gap-x-[clamp(6px,1.6vw,14px)] gap-y-2.5" : "gap-x-1.5 gap-y-1"}`}
      style={{ gridTemplateColumns: `repeat(${columns}, max-content)` }}
    >
      {Array.from({ length: capacity }, (_, index) => {
        const available = index < free;
        return (
          <li key={index} className="leading-none">
            <SparkleMark
              filled
              className={`${markSize} transition-[color,transform,opacity] duration-500 ease-[var(--ease-out-strong)] ${
                available ? `${lit} scale-100` : `${dim} scale-[0.78]`
              }`}
            />
          </li>
        );
      })}
    </ul>
  );
}
