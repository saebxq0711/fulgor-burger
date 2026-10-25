/**
 * CSV para Excel/Sheets en español: separador ";" , BOM UTF-8 y protección contra
 * inyección de fórmulas (celdas que empiezan por = + - @ se anteponen con ').
 */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[";\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: unknown[][]): string {
  return "﻿" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n") + "\r\n";
}
