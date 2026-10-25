import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/server/csv";

describe("exportación CSV", () => {
  it("neutraliza fórmulas que Excel ejecutaría", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(csvCell("+573001234567")).toBe("'+573001234567");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("escapa separadores, comillas y saltos de línea", () => {
    expect(csvCell("Calle 10; apto 4")).toBe('"Calle 10; apto 4"');
    expect(csvCell('Dijo "hola"')).toBe('"Dijo ""hola"""');
    expect(csvCell("línea 1\nlínea 2")).toBe('"línea 1\nlínea 2"');
    expect(csvCell(null)).toBe("");
  });

  it("incluye BOM UTF-8 para que Excel muestre tildes", () => {
    const csv = toCsv([["Nombre"], ["María"]]);
    expect(csv.startsWith("\ufeffNombre\r\nMaría")).toBe(true);
  });
});
