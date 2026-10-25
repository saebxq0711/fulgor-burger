/**
 * Número cuyos dígitos giran al cambiar, como un tablero de salidas: solo se mueve cuando
 * el servidor reporta un cambio real de cupos. La cinta 0–9 es contenido generado por CSS,
 * así que el texto del documento (copiar, lectores de pantalla, búsquedas) es solo el número.
 */
export function RollingNumber({ value, className }: { value: number; className?: string }) {
  const digits = String(Math.max(0, value)).split("");
  return (
    <span className={`relative inline-flex leading-[1.2] tabular ${className ?? ""}`} style={{ verticalAlign: "-0.22em" }}>
      <span className="sr-only">{value}</span>
      {digits.map((digit, index) => (
        <span key={`${digits.length}-${index}`} aria-hidden className="relative inline-block overflow-hidden" style={{ height: "1.2em", width: "0.62em" }}>
          <span
            className="digit-reel absolute inset-x-0 top-0 text-center transition-transform duration-700 ease-[var(--ease-out-strong)] motion-reduce:transition-none"
            style={{ transform: `translateY(${-Number(digit) * 10}%)` }}
          />
        </span>
      ))}
    </span>
  );
}
