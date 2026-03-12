import { Router, type IRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db } from "@workspace/db";
import { resinEntriesTable } from "@workspace/db/schema";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Column name aliases (case-insensitive)
const FIELD_ALIASES: Record<string, string> = {
  // entryType
  "type": "entryType", "entry type": "entryType", "entry_type": "entryType",
  "source/demand": "entryType", "source or demand": "entryType",
  // resinCategory
  "category": "resinCategory", "resin category": "resinCategory", "resin_category": "resinCategory",
  "material category": "resinCategory",
  // date
  "date": "date",
  // counterparty
  "counterparty": "counterparty", "customer": "counterparty", "supplier": "counterparty",
  "customer/supplier": "counterparty", "company": "counterparty", "company name": "counterparty",
  // personInCharge
  "person in charge": "personInCharge", "pic": "personInCharge", "person_in_charge": "personInCharge",
  "contact": "personInCharge", "contact person": "personInCharge",
  // resinType
  "resin type": "resinType", "resin_type": "resinType", "resin": "resinType", "polymer": "resinType",
  // manufacturer
  "manufacturer": "manufacturer", "maker": "manufacturer", "brand": "manufacturer",
  // grade
  "grade": "grade", "grade id": "grade",
  // ppType
  "pp type": "ppType", "pp_type": "ppType", "homopolymer/copolymer": "ppType",
  // sampleAvailable
  "sample available": "sampleAvailable", "sample": "sampleAvailable", "sample_available": "sampleAvailable",
  // packaging
  "packaging": "packaging", "packing": "packaging", "package type": "packaging",
  // meltFlowIndex
  "melt flow index": "meltFlowIndex", "mfi": "meltFlowIndex", "melt flow": "meltFlowIndex",
  "melt_flow_index": "meltFlowIndex",
  // charpy
  "charpy": "charpy", "charpy impact": "charpy",
  // izod
  "izod": "izod", "izod impact": "izod",
  // density
  "density": "density",
  // price
  "price": "price", "price (usd/mt)": "price", "price usd": "price",
  // quantity
  "quantity": "quantity", "qty": "quantity", "quantity (mt)": "quantity", "qty (mt)": "quantity",
  // remarks
  "remarks": "remarks", "notes": "remarks", "comment": "remarks", "comments": "remarks",
};

const VALID_RESIN_CATEGORIES = ["virgin", "offgrade", "recycled"];
const VALID_ENTRY_TYPES = ["source", "demand"];
const VALID_RESIN_TYPES = ["PP", "PE", "PS", "ABS", "PVC", "PET", "PC", "Nylon", "EVA", "PMMA", "Other"];
const VALID_PP_TYPES = ["Homopolymer", "Copolymer", "Random", "Impact", "Terpolymer", "N/A"];
const VALID_PACKAGING = ["Bags", "Octabin", "Bulk", "Jumbo_Bag", "Box", "Other"];

function normalizeStr(s: string): string {
  return s.trim().toLowerCase();
}

function resolveField(colName: string): string | null {
  return FIELD_ALIASES[normalizeStr(colName)] ?? null;
}

function normalizeEntryType(val: string): string | null {
  const v = val.trim().toLowerCase();
  if (v === "source" || v === "仕入れ先" || v === "supply" || v === "s") return "source";
  if (v === "demand" || v === "需要" || v === "buy" || v === "d" || v === "b") return "demand";
  return null;
}

function normalizeCategory(val: string): string | null {
  const v = val.trim().toLowerCase();
  if (v.includes("virgin") || v.includes("バージン")) return "virgin";
  if (v.includes("offgrade") || v.includes("off-grade") || v.includes("オフグレード")) return "offgrade";
  if (v.includes("recycled") || v.includes("recycle") || v.includes("リサイクル")) return "recycled";
  return null;
}

function normalizeResinType(val: string): string | null {
  const v = val.trim().toUpperCase();
  const match = VALID_RESIN_TYPES.find(t => t.toUpperCase() === v);
  return match || null;
}

function normalizePPType(val: string): string | null {
  if (!val || val.trim() === "" || val.trim() === "-") return null;
  const v = val.trim();
  const match = VALID_PP_TYPES.find(t => t.toLowerCase() === v.toLowerCase());
  return match || null;
}

function normalizePackaging(val: string): string | null {
  if (!val || val.trim() === "" || val.trim() === "-") return null;
  const v = val.trim().replace(/\s+/g, "_");
  const match = VALID_PACKAGING.find(p => p.toLowerCase() === v.toLowerCase());
  return match || null;
}

function normalizeBool(val: any): boolean | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "boolean") return val;
  const s = String(val).trim().toLowerCase();
  if (["yes", "true", "1", "y", "あり", "はい"].includes(s)) return true;
  if (["no", "false", "0", "n", "なし", "いいえ"].includes(s)) return false;
  return null;
}

function parseDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === "number") {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      const y = date.y, m = String(date.m).padStart(2, "0"), d = String(date.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  const s = String(val).trim();
  // Try common formats
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return null;
}

function parseNumber(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

router.post("/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "ファイルがアップロードされていません" });
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: false });
  } catch {
    return res.status(400).json({ error: "Excelファイルの読み込みに失敗しました。有効な .xlsx または .xls ファイルをアップロードしてください。" });
  }

  const results: { imported: number; skipped: number; errors: string[] } = {
    imported: 0,
    skipped: 0,
    errors: [],
  };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (rows.length < 2) continue;

    // First row = headers
    const headers = rows[0].map((h: any) => String(h));
    const fieldMap: Record<number, string> = {};
    headers.forEach((h, i) => {
      const field = resolveField(h);
      if (field) fieldMap[i] = field;
    });

    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      // Skip fully empty rows
      if (row.every((cell: any) => cell === "" || cell === null || cell === undefined)) continue;

      const data: Record<string, any> = {};
      Object.entries(fieldMap).forEach(([colIdx, field]) => {
        data[field] = row[parseInt(colIdx)];
      });

      // Validate required fields
      const entryType = data.entryType ? normalizeEntryType(String(data.entryType)) : null;
      const resinCategory = data.resinCategory ? normalizeCategory(String(data.resinCategory)) : null;
      const date = data.date ? parseDate(data.date) : null;
      const counterparty = data.counterparty ? String(data.counterparty).trim() : null;
      const personInCharge = data.personInCharge ? String(data.personInCharge).trim() : null;
      const resinType = data.resinType ? normalizeResinType(String(data.resinType)) : null;

      if (!entryType || !VALID_ENTRY_TYPES.includes(entryType)) {
        results.errors.push(`行 ${rowIdx + 1} (シート: ${sheetName}): 無効なエントリタイプ "${data.entryType ?? ""}"`);
        results.skipped++;
        continue;
      }
      if (!resinCategory) {
        results.errors.push(`行 ${rowIdx + 1} (シート: ${sheetName}): 無効なカテゴリ "${data.resinCategory ?? ""}"`);
        results.skipped++;
        continue;
      }
      if (!date) {
        results.errors.push(`行 ${rowIdx + 1} (シート: ${sheetName}): 無効な日付 "${data.date ?? ""}"`);
        results.skipped++;
        continue;
      }
      if (!counterparty) {
        results.errors.push(`行 ${rowIdx + 1} (シート: ${sheetName}): 取引先が空です`);
        results.skipped++;
        continue;
      }
      if (!personInCharge) {
        results.errors.push(`行 ${rowIdx + 1} (シート: ${sheetName}): 担当者が空です`);
        results.skipped++;
        continue;
      }
      if (!resinType) {
        results.errors.push(`行 ${rowIdx + 1} (シート: ${sheetName}): 無効な樹脂種別 "${data.resinType ?? ""}"`);
        results.skipped++;
        continue;
      }

      try {
        await db.insert(resinEntriesTable).values({
          entryType: entryType as "source" | "demand",
          resinCategory: resinCategory as "virgin" | "offgrade" | "recycled",
          date,
          counterparty,
          personInCharge,
          resinType: resinType as any,
          manufacturer: data.manufacturer ? String(data.manufacturer).trim() || null : null,
          grade: data.grade ? String(data.grade).trim() || null : null,
          ppType: data.ppType ? normalizePPType(String(data.ppType)) as any : null,
          sampleAvailable: data.sampleAvailable !== undefined ? normalizeBool(data.sampleAvailable) : null,
          packaging: data.packaging ? normalizePackaging(String(data.packaging)) as any : null,
          meltFlowIndex: data.meltFlowIndex !== undefined ? String(parseNumber(data.meltFlowIndex) ?? "") || null : null,
          charpy: data.charpy !== undefined ? String(parseNumber(data.charpy) ?? "") || null : null,
          izod: data.izod !== undefined ? String(parseNumber(data.izod) ?? "") || null : null,
          density: data.density !== undefined ? String(parseNumber(data.density) ?? "") || null : null,
          price: data.price !== undefined ? String(parseNumber(data.price) ?? "") || null : null,
          quantity: data.quantity !== undefined ? String(parseNumber(data.quantity) ?? "") || null : null,
          remarks: data.remarks ? String(data.remarks).trim() || null : null,
        });
        results.imported++;
      } catch (err) {
        results.errors.push(`行 ${rowIdx + 1} (シート: ${sheetName}): データベースエラー`);
        results.skipped++;
      }
    }
  }

  res.json(results);
});

export default router;
