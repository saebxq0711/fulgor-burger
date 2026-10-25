/**
 * Formatea pesos colombianos enteros con el estilo es-CO: 28000 → "$ 28.000".
 * Implementación propia (sin Intl) para que servidor y navegador produzcan exactamente
 * el mismo texto y no haya diferencias al hidratar.
 */
export function formatCop(value: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = Math.round(Math.abs(value)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}$\u00a0${grouped}`;
}
