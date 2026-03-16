import * as XLSX from "xlsx";
import { ResinEntry } from "@workspace/api-client-react";
import { ColumnKey } from "@/components/ResinTable";

const COL_LABEL: Record<string, string> = {
  counterparty:   "取引先",
  date:           "日付",
  personInCharge: "担当者",
  resinType:      "樹脂",
  ppType:         "PP種類",
  manufacturer:   "メーカー",
  grade:          "グレード",
  charpyLower:    "シャルピー 下限",
  charpyUpper:    "シャルピー 上限",
  izodLower:      "アイゾッド 下限",
  izodUpper:      "アイゾッド 上限",
  meltFlowIndexLower: "MI 下限",
  meltFlowIndexUpper: "MI 上限",
  densityLower:   "密度 下限",
  densityUpper:   "密度 上限",
  packaging:      "包装",
  sampleAvailable:"サンプル",
  price:          "価格 (円/kg)",
  priceLower:     "価格 下限 (円/kg)",
  priceUpper:     "価格 上限 (円/kg)",
  quantity:       "数量 (kg)",
  quantityLower:  "数量 下限 (kg)",
  quantityUpper:  "数量 上限 (kg)",
};

export function exportToExcel(
  data: ResinEntry[],
  visibleColumns: Set<ColumnKey>,
  filename?: string,
) {
  const colMap: { key: keyof ResinEntry; label: string }[] = [];

  // Map ColumnKey → one or more ResinEntry fields
  const expand: { colKey: ColumnKey; fields: (keyof ResinEntry)[] }[] = [
    { colKey: "date",           fields: ["date"] },
    { colKey: "personInCharge", fields: ["personInCharge"] },
    { colKey: "resinType",      fields: ["resinType", "ppType"] },
    { colKey: "manufacturer",   fields: ["manufacturer"] },
    { colKey: "grade",          fields: ["grade"] },
    { colKey: "charpy",         fields: ["charpyLower", "charpyUpper"] },
    { colKey: "izod",           fields: ["izodLower", "izodUpper"] },
    { colKey: "specs",          fields: ["meltFlowIndexLower", "meltFlowIndexUpper", "densityLower", "densityUpper", "packaging", "sampleAvailable"] },
    { colKey: "price",          fields: ["priceLower", "priceUpper"] },
    { colKey: "quantity",       fields: ["quantityLower", "quantityUpper"] },
  ];

  colMap.push({ key: "counterparty", label: COL_LABEL["counterparty"] });
  for (const { colKey, fields } of expand) {
    if (visibleColumns.has(colKey)) {
      for (const f of fields) {
        colMap.push({ key: f, label: COL_LABEL[f as string] ?? f });
      }
    }
  }

  const rows = data.map(entry =>
    Object.fromEntries(colMap.map(({ key, label }) => {
      const val = entry[key];
      return [label, val ?? ""];
    }))
  );

  const ws = XLSX.utils.json_to_sheet(rows, { header: colMap.map(c => c.label) });

  // Auto-width
  const colWidths = colMap.map(({ label }) => {
    const maxLen = Math.max(
      label.length * 2,
      ...rows.map(r => String(r[label] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 30) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "エクスポート");

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  XLSX.writeFile(wb, filename ?? `resinflow_${today}.xlsx`);
}
