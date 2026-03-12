import { Router, type IRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db } from "@workspace/db";
import { resinEntriesTable } from "@workspace/db/schema";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ---------------------------------------------------------------------------
// Column alias map — keys are lower-cased, trimmed header values
// Half-width katakana (ｱｲｿﾞｯﾄﾞ etc.) are included alongside full-width
// ---------------------------------------------------------------------------
const FIELD_ALIASES: Record<string, string> = {
  // ── entryType ────────────────────────────────────────────────────────────
  "type": "entryType",
  "entry type": "entryType",
  "entry_type": "entryType",
  "source/demand": "entryType",
  "source or demand": "entryType",
  "区分": "entryType",
  "仕入/販売": "entryType",

  // ── resinCategory ────────────────────────────────────────────────────────
  "category": "resinCategory",
  "resin category": "resinCategory",
  "resin_category": "resinCategory",
  "material category": "resinCategory",
  "カテゴリ": "resinCategory",
  "種類": "resinCategory",

  // ── date ─────────────────────────────────────────────────────────────────
  "date": "date",
  "日付": "date",
  "日付け": "date",

  // ── counterparty ─────────────────────────────────────────────────────────
  "counterparty": "counterparty",
  "customer": "counterparty",
  "supplier": "counterparty",
  "customer/supplier": "counterparty",
  "company": "counterparty",
  "company name": "counterparty",
  "紹介先": "counterparty",
  "仕入先": "counterparty",
  "取引先": "counterparty",
  "顧客": "counterparty",
  "供給先": "counterparty",
  "販売先": "counterparty",

  // ── personInCharge ───────────────────────────────────────────────────────
  "person in charge": "personInCharge",
  "pic": "personInCharge",
  "person_in_charge": "personInCharge",
  "contact": "personInCharge",
  "contact person": "personInCharge",
  "仕入担当": "personInCharge",
  "担当者": "personInCharge",
  "担当": "personInCharge",
  "担当名": "personInCharge",
  "販売担当": "personInCharge",

  // ── resinType ────────────────────────────────────────────────────────────
  "resin type": "resinType",
  "resin_type": "resinType",
  "resin": "resinType",
  "polymer": "resinType",
  "樹脂": "resinType",
  "樹脂種類": "resinType",
  "材料": "resinType",
  "ポリマー": "resinType",

  // ── manufacturer ─────────────────────────────────────────────────────────
  "manufacturer": "manufacturer",
  "maker": "manufacturer",
  "brand": "manufacturer",
  "ﾒｰｶｰ": "manufacturer",
  "メーカー": "manufacturer",
  "製造メーカー": "manufacturer",
  "メーカー名": "manufacturer",

  // ── grade ────────────────────────────────────────────────────────────────
  "grade": "grade",
  "grade id": "grade",
  "ｸﾞﾚｰﾄﾞ": "grade",
  "グレード": "grade",
  "グレード名": "grade",
  "品番": "grade",

  // ── ppType ───────────────────────────────────────────────────────────────
  "pp type": "ppType",
  "pp_type": "ppType",
  "homopolymer/copolymer": "ppType",
  "ﾀｲﾌﾟppの場合": "ppType",
  "タイプppの場合": "ppType",
  "ppのタイプ": "ppType",
  "ppタイプ": "ppType",
  "タイプ": "ppType",

  // ── sampleAvailable ──────────────────────────────────────────────────────
  "sample available": "sampleAvailable",
  "sample": "sampleAvailable",
  "sample_available": "sampleAvailable",
  "サンプル": "sampleAvailable",
  "サンプル有無": "sampleAvailable",
  "試料": "sampleAvailable",

  // ── packaging ────────────────────────────────────────────────────────────
  "packaging": "packaging",
  "packing": "packaging",
  "package type": "packaging",
  "荷姿": "packaging",
  "梱包形態": "packaging",
  "梱包": "packaging",
  "荷形態": "packaging",

  // ── meltFlowIndex ────────────────────────────────────────────────────────
  "melt flow index": "meltFlowIndex",
  "mfi": "meltFlowIndex",
  "melt flow": "meltFlowIndex",
  "melt_flow_index": "meltFlowIndex",
  "ﾒﾙﾄ": "meltFlowIndex",
  "メルト": "meltFlowIndex",
  "メルトフロー": "meltFlowIndex",
  "mfr": "meltFlowIndex",

  // ── charpy ───────────────────────────────────────────────────────────────
  "charpy": "charpy",
  "charpy impact": "charpy",
  "ｼｬﾙﾋﾟｰ": "charpy",
  "シャルピー": "charpy",
  "シャルピー衝撃値": "charpy",

  // ── izod ─────────────────────────────────────────────────────────────────
  "izod": "izod",
  "izod impact": "izod",
  "ｱｲｿﾞｯﾄﾞ": "izod",
  "アイゾッド": "izod",
  "アイゾット": "izod",
  "アイゾット衝撃値": "izod",

  // ── density ──────────────────────────────────────────────────────────────
  "density": "density",
  "比重": "density",
  "密度": "density",

  // ── price (最終交渉価格 / negotiated price) ───────────────────────────────
  "price": "price",
  "price (usd/mt)": "price",
  "price usd": "price",
  "最終交渉価格": "price",
  "交渉価格": "price",
  "仕入価格": "price",
  "購入価格": "price",
  "単価": "price",

  // ── quantity ─────────────────────────────────────────────────────────────
  "quantity": "quantity",
  "qty": "quantity",
  "quantity (mt)": "quantity",
  "qty (mt)": "quantity",
  "希望数量": "quantity",
  "数量": "quantity",
  "ロット": "quantity",

  // ── remarks ──────────────────────────────────────────────────────────────
  "remarks": "remarks",
  "notes": "remarks",
  "comment": "remarks",
  "comments": "remarks",
  "備考": "remarks",
  "メモ": "remarks",
  "コメント": "remarks",
  "注記": "remarks",

  // ── storageLocation (他県置場) ────────────────────────────────────────────
  "storage location": "storageLocation",
  "storage": "storageLocation",
  "他県置場": "storageLocation",
  "置き場": "storageLocation",
  "置場": "storageLocation",
  "保管場所": "storageLocation",

  // ── arrivalPrice (丸喜着) ─────────────────────────────────────────────────
  "arrival price": "arrivalPrice",
  "landed price": "arrivalPrice",
  "丸喜着": "arrivalPrice",
  "着値": "arrivalPrice",
  "着価格": "arrivalPrice",

  // ── spotPrice (スポット) ──────────────────────────────────────────────────
  "spot": "spotPrice",
  "spot price": "spotPrice",
  "スポット": "spotPrice",
  "スポット価格": "spotPrice",

  // ── prospectiveBuyer (ワーク希望者) ──────────────────────────────────────
  "prospective buyer": "prospectiveBuyer",
  "interested party": "prospectiveBuyer",
  "ワーク希望者": "prospectiveBuyer",
  "購入希望者": "prospectiveBuyer",
  "希望者": "prospectiveBuyer",

  // ── proposedTo (提案先) ───────────────────────────────────────────────────
  "proposed to": "proposedTo",
  "proposal target": "proposedTo",
  "提案先": "proposedTo",
  "販売提案先": "proposedTo",

  // ── sellingPrice (販売価格) ────────────────────────────────────────────────
  "selling price": "sellingPrice",
  "sale price": "sellingPrice",
  "販売価格": "sellingPrice",
  "売値": "sellingPrice",
  "販売単価": "sellingPrice",
};

// ---------------------------------------------------------------------------
// Sheet-name auto-detection helpers
// ---------------------------------------------------------------------------
function detectCategoryFromSheet(name: string): "virgin" | "offgrade" | "recycled" | null {
  const n = name.toLowerCase();
  if (n.includes("virgin") || n.includes("バージン")) return "virgin";
  if (n.includes("offgrade") || n.includes("off-grade") || n.includes("オフグレード")) return "offgrade";
  if (n.includes("recycled") || n.includes("recycle") || n.includes("リサイクル")) return "recycled";
  return null;
}

function detectEntryTypeFromSheet(name: string): "source" | "demand" | null {
  const n = name.toLowerCase();
  if (n.includes("仕入") || n.includes("source") || n.includes("supply")) return "source";
  if (n.includes("需要") || n.includes("販売先") || n.includes("demand") || n.includes("buy")) return "demand";
  return null;
}

// ---------------------------------------------------------------------------
// Value normalizers
// ---------------------------------------------------------------------------
const VALID_RESIN_TYPES = ["PP", "PE", "PS", "ABS", "PVC", "PET", "PC", "Nylon", "EVA", "PMMA", "Other"];
const VALID_PP_TYPES = ["Homopolymer", "Copolymer", "Random", "Impact", "Terpolymer", "N/A"];
const VALID_PACKAGING = ["Bags", "Octabin", "Bulk", "Jumbo_Bag", "Box", "Other"];

function resolveField(colName: string): string | null {
  return FIELD_ALIASES[colName.trim().toLowerCase()] ?? null;
}

function normalizeEntryType(val: string): "source" | "demand" | null {
  const v = val.trim().toLowerCase();
  if (["source", "仕入れ先", "仕入先", "supply", "s", "仕入"].includes(v)) return "source";
  if (["demand", "需要", "buy", "d", "b", "販売先"].includes(v)) return "demand";
  return null;
}

function normalizeCategory(val: string): "virgin" | "offgrade" | "recycled" | null {
  const v = val.trim().toLowerCase();
  if (v.includes("virgin") || v.includes("バージン")) return "virgin";
  if (v.includes("offgrade") || v.includes("off-grade") || v.includes("オフグレード")) return "offgrade";
  if (v.includes("recycled") || v.includes("recycle") || v.includes("リサイクル")) return "recycled";
  return null;
}

function normalizeResinType(val: string): string | null {
  const v = val.trim().toUpperCase();
  return VALID_RESIN_TYPES.find(t => t.toUpperCase() === v) ?? null;
}

function normalizePPType(val: string): string | null {
  if (!val || !val.trim() || val.trim() === "-") return null;
  const v = val.trim();
  return VALID_PP_TYPES.find(t => t.toLowerCase() === v.toLowerCase()) ?? null;
}

function normalizePackaging(val: string): string | null {
  if (!val || !val.trim() || val.trim() === "-") return null;
  const v = val.trim().replace(/\s+/g, "_");
  return VALID_PACKAGING.find(p => p.toLowerCase() === v.toLowerCase()) ?? null;
}

function normalizeBool(val: any): boolean | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "boolean") return val;
  const s = String(val).trim().toLowerCase();
  if (["yes", "true", "1", "y", "あり", "はい", "○", "◯"].includes(s)) return true;
  if (["no", "false", "0", "n", "なし", "いいえ", "×", "x"].includes(s)) return false;
  return null;
}

function parseDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === "number") {
    // Convert Excel serial date to calendar date
    // 25569 = days between Excel epoch (Jan 0 1900) and Unix epoch (Jan 1 1970)
    const ms = (val - 25569) * 86400 * 1000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    }
  }
  const s = String(val).trim();
  // yyyy/mm/dd or yyyy-mm-dd (including single-digit month/day)
  const slash = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (slash) return `${slash[1]}-${String(slash[2]).padStart(2, "0")}-${String(slash[3]).padStart(2, "0")}`;
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  return null;
}

function parseNumber(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, "").replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? null : n;
}

function numStr(val: any): string | null {
  const n = parseNumber(val);
  return n !== null ? String(n) : null;
}

// ---------------------------------------------------------------------------
// Import route
// ---------------------------------------------------------------------------
router.post("/import", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "ファイルがアップロードされていません" });

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: false });
  } catch {
    return res.status(400).json({ error: "Excelファイルの読み込みに失敗しました。有効な .xlsx / .xls / .csv ファイルをアップロードしてください。" });
  }

  const results = { imported: 0, skipped: 0, errors: [] as string[] };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (rows.length < 2) continue;

    // Auto-detect category and entry type from sheet name
    const sheetCategory = detectCategoryFromSheet(sheetName);
    const sheetEntryType = detectEntryTypeFromSheet(sheetName);

    // Build column → field mapping from header row
    const headers = rows[0].map((h: any) => String(h));
    const fieldMap: Record<number, string> = {};
    headers.forEach((h, i) => {
      const field = resolveField(h);
      if (field) fieldMap[i] = field;
    });

    for (let ri = 1; ri < rows.length; ri++) {
      const row = rows[ri];
      if (row.every((c: any) => c === "" || c === null || c === undefined)) continue;

      // Collect raw values by field name
      const data: Record<string, any> = {};
      Object.entries(fieldMap).forEach(([ci, field]) => {
        data[field] = row[parseInt(ci)];
      });

      // Resolve required fields — fall back to sheet-name detection
      const entryType: "source" | "demand" | null =
        data.entryType ? normalizeEntryType(String(data.entryType)) : sheetEntryType;
      const resinCategory: "virgin" | "offgrade" | "recycled" | null =
        data.resinCategory ? normalizeCategory(String(data.resinCategory)) : sheetCategory;
      const date = data.date ? parseDate(data.date) : null;
      const counterparty = data.counterparty ? String(data.counterparty).trim() : null;
      const personInCharge = data.personInCharge ? String(data.personInCharge).trim() : null;
      const resinType = data.resinType ? normalizeResinType(String(data.resinType)) : null;

      // Validation
      if (!entryType) {
        results.errors.push(`行 ${ri + 1} (シート: ${sheetName}): エントリタイプ不明 — 列「type」か「仕入/需要」を追加するか、シート名に「仕入」または「需要」を含めてください`);
        results.skipped++; continue;
      }
      if (!resinCategory) {
        results.errors.push(`行 ${ri + 1} (シート: ${sheetName}): カテゴリ不明 — 列「category」か「カテゴリ」を追加するか、シート名に「バージン/オフグレード/リサイクル」を含めてください`);
        results.skipped++; continue;
      }
      if (!date) {
        results.errors.push(`行 ${ri + 1} (シート: ${sheetName}): 日付が無効 "${data.date ?? ""}"`);
        results.skipped++; continue;
      }
      if (!counterparty) {
        results.errors.push(`行 ${ri + 1} (シート: ${sheetName}): 取引先（紹介先）が空です`);
        results.skipped++; continue;
      }
      if (!personInCharge) {
        results.errors.push(`行 ${ri + 1} (シート: ${sheetName}): 担当者（仕入担当）が空です`);
        results.skipped++; continue;
      }
      if (!resinType) {
        results.errors.push(`行 ${ri + 1} (シート: ${sheetName}): 樹脂種別が無効 "${data.resinType ?? ""}"`);
        results.skipped++; continue;
      }

      try {
        await db.insert(resinEntriesTable).values({
          entryType,
          resinCategory,
          date,
          counterparty,
          personInCharge,
          resinType: resinType as any,
          manufacturer: data.manufacturer ? String(data.manufacturer).trim() || null : null,
          grade: data.grade ? String(data.grade).trim() || null : null,
          ppType: data.ppType ? normalizePPType(String(data.ppType)) as any : null,
          sampleAvailable: data.sampleAvailable !== undefined ? normalizeBool(data.sampleAvailable) : null,
          packaging: data.packaging ? normalizePackaging(String(data.packaging)) as any : null,
          meltFlowIndex: numStr(data.meltFlowIndex),
          charpy: numStr(data.charpy),
          izod: numStr(data.izod),
          density: numStr(data.density),
          price: numStr(data.price),
          quantity: numStr(data.quantity),
          remarks: data.remarks ? String(data.remarks).trim() || null : null,
          // Extended fields
          storageLocation: data.storageLocation ? String(data.storageLocation).trim() || null : null,
          arrivalPrice: numStr(data.arrivalPrice),
          spotPrice: numStr(data.spotPrice),
          prospectiveBuyer: data.prospectiveBuyer ? String(data.prospectiveBuyer).trim() || null : null,
          proposedTo: data.proposedTo ? String(data.proposedTo).trim() || null : null,
          sellingPrice: numStr(data.sellingPrice),
        });
        results.imported++;
      } catch (err) {
        results.errors.push(`行 ${ri + 1} (シート: ${sheetName}): DBエラー — ${String(err).slice(0, 80)}`);
        results.skipped++;
      }
    }
  }

  res.json(results);
});

export default router;
