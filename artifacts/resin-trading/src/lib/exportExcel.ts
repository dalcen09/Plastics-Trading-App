import * as XLSX from "xlsx";
import { ResinEntry } from "@workspace/api-client-react";
import { ColumnKey } from "@/components/ResinTable";

const COL_LABEL: Record<string, string> = {
  counterparty:  "取引先",
  date:          "日付",
  personInCharge:"担当者",
  resinType:     "樹脂",
  ppType:        "PP種類",
  manufacturer:  "メーカー",
  grade:         "グレード",
  charpy:        "シャルピー",
  izod:          "アイゾッド",
  meltFlowIndex: "MFI",
  density:       "密度",
  packaging:     "包装",
  sampleAvailable:"サンプル",
  price:         "価格 (円/kg)",
  quantity:      "数量 (kg)",
};

export function exportToExcel(
  data: ResinEntry[],
  visibleColumns: Set<ColumnKey>,
  filename?: string,
) {
  // Build the ordered column list: counterparty always first, then visible columns
  const colOrder: (keyof ResinEntry)[] = ["counterparty"];

  const colMap: { key: keyof ResinEntry; label: string }[] = [];

  // Map ColumnKey → one or more ResinEntry fields
  const expand: { colKey: ColumnKey; fields: (keyof ResinEntry)[] }[] = [
    { colKey: "date",           fields: ["date"] },
    { colKey: "personInCharge", fields: ["personInCharge"] },
    { colKey: "resinType",      fields: ["resinType", "ppType"] },
    { colKey: "manufacturer",   fields: ["manufacturer"] },
    { colKey: "grade",          fields: ["grade"] },
    { colKey: "charpy",         fields: ["charpy"] },
    { colKey: "izod",           fields: ["izod"] },
    { colKey: "specs",          fields: ["meltFlowIndex", "density", "packaging", "sampleAvailable"] },
    { colKey: "price",          fields: ["price"] },
    { colKey: "quantity",       fields: ["quantity"] },
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
      let val = entry[key];
      if (key === "sampleAvailable") val = val ? "あり" : "" as any;
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
