import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { resinEntriesTable, staffTable, prospectiveBuyersTable } from "@workspace/db/schema";
import { eq, and, inArray, isNull, isNotNull, sql } from "drizzle-orm";
import {
  CreateSourceBody,
  UpdateSourceBody,
  UpdateSourceParams,
  DeleteSourceParams,
  ListSourcesQueryParams,
  CreateDemandBody,
  UpdateDemandBody,
  UpdateDemandParams,
  DeleteDemandParams,
  ListDemandsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /api/persons-in-charge — managed staff list merged with names already in data
router.get("/persons-in-charge", async (_req, res) => {
  const [staffRows, dataRows] = await Promise.all([
    db.select({ name: staffTable.name }).from(staffTable),
    db.selectDistinct({ name: resinEntriesTable.personInCharge })
      .from(resinEntriesTable)
      .where(and(isNotNull(resinEntriesTable.personInCharge), isNull(resinEntriesTable.deletedAt))),
  ]);
  const names = Array.from(new Set([
    ...staffRows.map(r => r.name),
    ...dataRows.map(r => r.name).filter(Boolean),
  ])).sort((a, b) => a!.localeCompare(b!, "ja"));
  res.json(names);
});

// GET /api/prospective-buyers — managed prospective buyer list
router.get("/prospective-buyers", async (_req, res) => {
  const rows = await db.select({ name: prospectiveBuyersTable.name }).from(prospectiveBuyersTable).orderBy(prospectiveBuyersTable.name);
  res.json(rows.map(r => r.name));
});

// GET /api/resin-entries/custom-resin-types — distinct non-null otherResinType values in use
router.get("/custom-resin-types", async (_req, res) => {
  const rows = await db
    .selectDistinct({ value: resinEntriesTable.otherResinType })
    .from(resinEntriesTable)
    .where(and(isNotNull(resinEntriesTable.otherResinType), isNull(resinEntriesTable.deletedAt)));
  const values = rows
    .map(r => r.value)
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .sort();
  res.json(values);
});

function toNumber(val: string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function serializeEntry(entry: typeof resinEntriesTable.$inferSelect) {
  return {
    ...entry,
    meltFlowIndexLower: toNumber(entry.meltFlowIndexLower),
    meltFlowIndexUpper: toNumber(entry.meltFlowIndexUpper),
    charpyLower: toNumber(entry.charpyLower),
    charpyUpper: toNumber(entry.charpyUpper),
    izodLower: toNumber(entry.izodLower),
    izodUpper: toNumber(entry.izodUpper),
    densityLower: toNumber(entry.densityLower),
    densityUpper: toNumber(entry.densityUpper),
    price: toNumber(entry.price),
    priceLower: toNumber(entry.priceLower),
    priceUpper: toNumber(entry.priceUpper),
    quantityLower: toNumber(entry.quantityLower),
    quantityUpper: toNumber(entry.quantityUpper),
    locationType: entry.locationType,
    storageLocation: entry.storageLocation,
    imageUrls: entry.imageUrls ?? [],
    tdsUrl: entry.tdsUrl,
    quantity: toNumber(entry.quantity),
    arrivalPrice: toNumber(entry.arrivalPrice),
    spotPrice: toNumber(entry.spotPrice),
    desiredQuantity: toNumber(entry.desiredQuantity),
    sellingPrice: toNumber(entry.sellingPrice),
    packagingWeight: toNumber(entry.packagingWeight),
    finalNegotiatedPrice: toNumber(entry.finalNegotiatedPrice),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    deletedAt: entry.deletedAt ? entry.deletedAt.toISOString() : null,
  };
}

// ---- SOURCES ----

router.get("/sources", async (req, res) => {
  const query = ListSourcesQueryParams.parse(req.query);
  const conditions = [eq(resinEntriesTable.entryType, "source"), isNull(resinEntriesTable.deletedAt)];
  if (query.resinCategory) {
    conditions.push(eq(resinEntriesTable.resinCategory, query.resinCategory));
  }
  const rows = await db.select().from(resinEntriesTable).where(and(...conditions)).orderBy(resinEntriesTable.date, resinEntriesTable.id);
  res.json(rows.map(serializeEntry));
});

router.post("/sources", async (req, res) => {
  const body = CreateSourceBody.parse(req.body);
  const [row] = await db.insert(resinEntriesTable).values({
    ...body,
    entryType: "source",
    meltFlowIndexLower: body.meltFlowIndexLower?.toString(),
    meltFlowIndexUpper: body.meltFlowIndexUpper?.toString(),
    charpyLower: body.charpyLower?.toString(),
    charpyUpper: body.charpyUpper?.toString(),
    izodLower: body.izodLower?.toString(),
    izodUpper: body.izodUpper?.toString(),
    densityLower: body.densityLower?.toString(),
    densityUpper: body.densityUpper?.toString(),
    price: body.price?.toString(),
    priceLower: body.priceLower?.toString(),
    priceUpper: body.priceUpper?.toString(),
    locationType: body.locationType ?? null,
    storageLocation: body.storageLocation ?? null,
    imageUrls: body.imageUrls ?? null,
    tdsUrl: body.tdsUrl ?? null,
    quantity: body.quantity?.toString(),
    quantityLower: body.quantityLower?.toString(),
    quantityUpper: body.quantityUpper?.toString(),
  }).returning();
  invalidateMatchCache();
  res.status(201).json(serializeEntry(row));
});

router.put("/sources/:id", async (req, res) => {
  const { id } = UpdateSourceParams.parse(req.params);
  const body = UpdateSourceBody.parse(req.body);
  const [row] = await db.update(resinEntriesTable).set({
    ...body,
    meltFlowIndexLower: body.meltFlowIndexLower?.toString(),
    meltFlowIndexUpper: body.meltFlowIndexUpper?.toString(),
    charpyLower: body.charpyLower?.toString(),
    charpyUpper: body.charpyUpper?.toString(),
    izodLower: body.izodLower?.toString(),
    izodUpper: body.izodUpper?.toString(),
    densityLower: body.densityLower?.toString(),
    densityUpper: body.densityUpper?.toString(),
    price: body.price?.toString(),
    priceLower: body.priceLower?.toString(),
    priceUpper: body.priceUpper?.toString(),
    locationType: body.locationType ?? null,
    storageLocation: body.storageLocation ?? null,
    imageUrls: body.imageUrls ?? null,
    tdsUrl: body.tdsUrl ?? null,
    quantity: body.quantity?.toString(),
    quantityLower: body.quantityLower?.toString(),
    quantityUpper: body.quantityUpper?.toString(),
    updatedAt: new Date(),
  }).where(and(eq(resinEntriesTable.id, id), eq(resinEntriesTable.entryType, "source"), isNull(resinEntriesTable.deletedAt))).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  invalidateMatchCache();
  res.json(serializeEntry(row));
});

// Soft delete single source
router.delete("/sources/:id", async (req, res) => {
  const { id } = DeleteSourceParams.parse(req.params);
  await db.update(resinEntriesTable)
    .set({ deletedAt: new Date() })
    .where(and(eq(resinEntriesTable.id, id), eq(resinEntriesTable.entryType, "source"), isNull(resinEntriesTable.deletedAt)));
  invalidateMatchCache();
  res.status(204).end();
});

// Soft batch-delete sources
router.post("/sources/batch-delete", async (req, res) => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
  if (ids.length === 0) return res.status(204).end();
  await db.update(resinEntriesTable)
    .set({ deletedAt: new Date() })
    .where(and(inArray(resinEntriesTable.id, ids), eq(resinEntriesTable.entryType, "source"), isNull(resinEntriesTable.deletedAt)));
  invalidateMatchCache();
  res.status(204).end();
});

// Batch update isClosed for sources
router.post("/sources/batch-status", async (req, res) => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
  const isClosed: string = req.body?.isClosed === "クローズ" ? "クローズ" : "オープン";
  if (ids.length === 0) return res.status(204).end();
  await db.update(resinEntriesTable)
    .set({ isClosed, updatedAt: new Date() })
    .where(and(inArray(resinEntriesTable.id, ids), eq(resinEntriesTable.entryType, "source"), isNull(resinEntriesTable.deletedAt)));
  invalidateMatchCache();
  res.status(204).end();
});

// ---- DEMANDS ----

router.get("/demands", async (req, res) => {
  const query = ListDemandsQueryParams.parse(req.query);
  const conditions = [eq(resinEntriesTable.entryType, "demand"), isNull(resinEntriesTable.deletedAt)];
  if (query.resinCategory) {
    conditions.push(eq(resinEntriesTable.resinCategory, query.resinCategory));
  }
  const rows = await db.select().from(resinEntriesTable).where(and(...conditions)).orderBy(resinEntriesTable.date, resinEntriesTable.id);
  res.json(rows.map(serializeEntry));
});

router.post("/demands", async (req, res) => {
  const body = CreateDemandBody.parse(req.body);
  const [row] = await db.insert(resinEntriesTable).values({
    ...body,
    entryType: "demand",
    meltFlowIndexLower: body.meltFlowIndexLower?.toString(),
    meltFlowIndexUpper: body.meltFlowIndexUpper?.toString(),
    charpyLower: body.charpyLower?.toString(),
    charpyUpper: body.charpyUpper?.toString(),
    izodLower: body.izodLower?.toString(),
    izodUpper: body.izodUpper?.toString(),
    densityLower: body.densityLower?.toString(),
    densityUpper: body.densityUpper?.toString(),
    price: body.price?.toString(),
    priceLower: body.priceLower?.toString(),
    priceUpper: body.priceUpper?.toString(),
    locationType: body.locationType ?? null,
    storageLocation: body.storageLocation ?? null,
    imageUrls: body.imageUrls ?? null,
    tdsUrl: body.tdsUrl ?? null,
    quantity: body.quantity?.toString(),
    quantityLower: body.quantityLower?.toString(),
    quantityUpper: body.quantityUpper?.toString(),
  }).returning();
  invalidateMatchCache();
  res.status(201).json(serializeEntry(row));
});

router.put("/demands/:id", async (req, res) => {
  const { id } = UpdateDemandParams.parse(req.params);
  const body = UpdateDemandBody.parse(req.body);
  const [row] = await db.update(resinEntriesTable).set({
    ...body,
    meltFlowIndexLower: body.meltFlowIndexLower?.toString(),
    meltFlowIndexUpper: body.meltFlowIndexUpper?.toString(),
    charpyLower: body.charpyLower?.toString(),
    charpyUpper: body.charpyUpper?.toString(),
    izodLower: body.izodLower?.toString(),
    izodUpper: body.izodUpper?.toString(),
    densityLower: body.densityLower?.toString(),
    densityUpper: body.densityUpper?.toString(),
    price: body.price?.toString(),
    priceLower: body.priceLower?.toString(),
    priceUpper: body.priceUpper?.toString(),
    locationType: body.locationType ?? null,
    storageLocation: body.storageLocation ?? null,
    imageUrls: body.imageUrls ?? null,
    tdsUrl: body.tdsUrl ?? null,
    quantity: body.quantity?.toString(),
    quantityLower: body.quantityLower?.toString(),
    quantityUpper: body.quantityUpper?.toString(),
    updatedAt: new Date(),
  }).where(and(eq(resinEntriesTable.id, id), eq(resinEntriesTable.entryType, "demand"), isNull(resinEntriesTable.deletedAt))).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  invalidateMatchCache();
  res.json(serializeEntry(row));
});

// Soft delete single demand
router.delete("/demands/:id", async (req, res) => {
  const { id } = DeleteDemandParams.parse(req.params);
  await db.update(resinEntriesTable)
    .set({ deletedAt: new Date() })
    .where(and(eq(resinEntriesTable.id, id), eq(resinEntriesTable.entryType, "demand"), isNull(resinEntriesTable.deletedAt)));
  invalidateMatchCache();
  res.status(204).end();
});

// Soft batch-delete demands
router.post("/demands/batch-delete", async (req, res) => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
  if (ids.length === 0) return res.status(204).end();
  await db.update(resinEntriesTable)
    .set({ deletedAt: new Date() })
    .where(and(inArray(resinEntriesTable.id, ids), eq(resinEntriesTable.entryType, "demand"), isNull(resinEntriesTable.deletedAt)));
  invalidateMatchCache();
  res.status(204).end();
});

// Batch update isClosed for demands
router.post("/demands/batch-status", async (req, res) => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
  const isClosed: string = req.body?.isClosed === "クローズ" ? "クローズ" : "オープン";
  if (ids.length === 0) return res.status(204).end();
  await db.update(resinEntriesTable)
    .set({ isClosed, updatedAt: new Date() })
    .where(and(inArray(resinEntriesTable.id, ids), eq(resinEntriesTable.entryType, "demand"), isNull(resinEntriesTable.deletedAt)));
  invalidateMatchCache();
  res.status(204).end();
});

// ---- TRASH ----

// GET /api/trash — list all soft-deleted entries
router.get("/trash", async (_req, res) => {
  const rows = await db.select().from(resinEntriesTable)
    .where(isNotNull(resinEntriesTable.deletedAt))
    .orderBy(resinEntriesTable.deletedAt);
  res.json(rows.map(serializeEntry));
});

// POST /api/trash/:id/restore — restore a single entry
router.post("/trash/:id/restore", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  const [row] = await db.update(resinEntriesTable)
    .set({ deletedAt: null })
    .where(and(eq(resinEntriesTable.id, id), isNotNull(resinEntriesTable.deletedAt)))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found in trash" });
  invalidateMatchCache();
  res.json(serializeEntry(row));
});

// POST /api/trash/batch-restore — restore multiple entries (must be before /:id routes)
router.post("/trash/batch-restore", async (req, res) => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
  if (ids.length === 0) return res.status(204).end();
  await db.update(resinEntriesTable)
    .set({ deletedAt: null })
    .where(and(inArray(resinEntriesTable.id, ids), isNotNull(resinEntriesTable.deletedAt)));
  invalidateMatchCache();
  res.status(204).end();
});

// DELETE /api/trash/batch-purge — permanently delete multiple entries (must be before /:id)
router.delete("/trash/batch-purge", async (req, res) => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
  if (ids.length === 0) return res.status(204).end();
  await db.delete(resinEntriesTable)
    .where(and(inArray(resinEntriesTable.id, ids), isNotNull(resinEntriesTable.deletedAt)));
  invalidateMatchCache();
  res.status(204).end();
});

// DELETE /api/trash/:id — permanently delete a single entry
router.delete("/trash/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(resinEntriesTable)
    .where(and(eq(resinEntriesTable.id, id), isNotNull(resinEntriesTable.deletedAt)));
  invalidateMatchCache();
  res.status(204).end();
});

// ---- MATCHES ----

function toNum(val: string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

/** Format a number without floating-point noise (e.g. 0.3000000000000004 → "0.3") */
function fmtN(n: number): string {
  return parseFloat(n.toPrecision(10)).toString();
}

function withinAbs(a: number | null, b: number | null, tol: number): boolean {
  if (a === null || b === null) return false;
  return Math.abs(a - b) <= tol;
}

const CATEGORY_LABEL: Record<string, string> = {
  virgin: "バージン", offgrade: "オフグレード", recycled: "リサイクル",
};

// ── In-memory match cache (invalidated on any mutation) ──────────────────────
type MatchResult = { source: ReturnType<typeof serializeEntry>; demand: ReturnType<typeof serializeEntry>; score: number; reasons: string[] };
let _matchCache: MatchResult[] | null = null;
let _matchCacheAt = 0;
const MATCH_CACHE_TTL = 60_000;

export function invalidateMatchCache() { _matchCache = null; }

async function getOrComputeAllMatches(): Promise<MatchResult[]> {
  if (_matchCache && Date.now() - _matchCacheAt < MATCH_CACHE_TTL) return _matchCache;

  const sources = await db.select().from(resinEntriesTable).where(and(eq(resinEntriesTable.entryType, "source"), isNull(resinEntriesTable.deletedAt)));
  const demands = await db.select().from(resinEntriesTable).where(and(eq(resinEntriesTable.entryType, "demand"), isNull(resinEntriesTable.deletedAt)));

  const matches: MatchResult[] = [];

  for (const source of sources) {
    for (const demand of demands) {
      if (source.resinCategory !== demand.resinCategory) continue;
      if (source.resinType !== demand.resinType) continue;

      const reasons: string[] = [];
      let score = 0;

      reasons.push(`カテゴリ一致: ${CATEGORY_LABEL[source.resinCategory] ?? source.resinCategory}`);
      reasons.push(`樹脂種別一致: ${source.resinType}`);
      score += 40;

      if (source.grade && demand.grade && source.grade.toLowerCase() === demand.grade.toLowerCase()) {
        reasons.push(`グレード一致: ${source.grade}`);
        score += 20;
      }

      if (source.manufacturer && demand.manufacturer && source.manufacturer.toLowerCase() === demand.manufacturer.toLowerCase()) {
        reasons.push(`メーカー一致: ${source.manufacturer}`);
        score += 10;
      }

      const srcLo = toNum(source.meltFlowIndexLower), srcHi = toNum(source.meltFlowIndexUpper);
      const dmLo = toNum(demand.meltFlowIndexLower), dmHi = toNum(demand.meltFlowIndexUpper);
      const demandHasMI = dmLo !== null || dmHi !== null;
      const sourceHasMI = srcLo !== null || srcHi !== null;
      if (demandHasMI && sourceHasMI) {
        const srcMid = srcLo !== null ? (srcHi !== null ? (srcLo + srcHi) / 2 : srcLo) : srcHi!;
        const inRange = (dmLo === null || srcMid >= dmLo) && (dmHi === null || srcMid <= dmHi);
        if (!inRange) continue;
        const dmRange = dmLo !== null && dmHi !== null ? `${fmtN(dmLo)}〜${fmtN(dmHi)}` : dmLo !== null ? `≥${fmtN(dmLo)}` : `≤${fmtN(dmHi!)}`;
        reasons.push(`MI範囲内: ${fmtN(srcMid)} ∈ ${dmRange} g/10min`);
        score += 15;
      }

      const srcDenLo = toNum(source.densityLower), srcDenHi = toNum(source.densityUpper);
      const dmDenLo = toNum(demand.densityLower), dmDenHi = toNum(demand.densityUpper);
      const srcDenMid = srcDenLo !== null && srcDenHi !== null ? (srcDenLo + srcDenHi) / 2 : srcDenLo;
      const dmDenMid = dmDenLo !== null && dmDenHi !== null ? (dmDenLo + dmDenHi) / 2 : dmDenLo;
      if (srcDenMid !== null && dmDenMid !== null && withinAbs(srcDenMid, dmDenMid, 0.5)) {
        reasons.push(`密度近似: ${fmtN(srcDenMid)} ↔ ${fmtN(dmDenMid)} g/cm³ (±0.5)`);
        score += 15;
      }

      if (source.resinType === "PP") {
        if (source.ppType && demand.ppType) {
          if (source.ppType !== demand.ppType) continue;
          reasons.push(`PPタイプ一致: ${source.ppType}`);
          score += 10;
        }
      }

      if (source.resinType === "PE") {
        if (source.peType && demand.peType) {
          if (source.peType !== demand.peType) continue;
          reasons.push(`PEタイプ一致: ${source.peType}`);
          score += 10;
        }
      }

      if (source.resinType === "PS") {
        if (source.psType && demand.psType) {
          if (source.psType !== demand.psType) continue;
          reasons.push(`PSタイプ一致: ${source.psType}`);
          score += 10;
        }
      }

      if (source.resinType === "ABS") {
        if (source.absType && demand.absType) {
          if (source.absType !== demand.absType) continue;
          reasons.push(`ABSタイプ一致: ${source.absType}`);
          score += 10;
        }
      }

      if (score >= 40) {
        matches.push({ source: serializeEntry(source), demand: serializeEntry(demand), score: Math.min(score, 100), reasons });
      }
    }
  }

  matches.sort((a, b) => b.score - a.score);
  _matchCache = matches;
  _matchCacheAt = Date.now();
  return matches;
}

// GET /matches/count  (must be before /matches to avoid route shadowing)
router.get("/matches/count", async (req, res) => {
  const { resinCategory } = req.query as { resinCategory?: string };
  const all = await getOrComputeAllMatches();
  const filtered = resinCategory ? all.filter(m => (m.source as any).resinCategory === resinCategory) : all;
  // Deduplicate by entry id for badge counts
  const seenIds = new Set<number>();
  let count = 0;
  for (const m of filtered) {
    const sid = (m.source as any).id as number;
    const did = (m.demand as any).id as number;
    if (!seenIds.has(sid)) { seenIds.add(sid); count++; }
    if (!seenIds.has(did)) { seenIds.add(did); count++; }
  }
  res.json({ count: filtered.length });
});

// GET /matches/count-by-entry
router.get("/matches/count-by-entry", async (req, res) => {
  const { resinCategory } = req.query as { resinCategory?: string };
  const all = await getOrComputeAllMatches();
  const filtered = resinCategory ? all.filter(m => (m.source as any).resinCategory === resinCategory) : all;
  const counts: Record<number, number> = {};
  for (const m of filtered) {
    const sid = (m.source as any).id as number;
    const did = (m.demand as any).id as number;
    counts[sid] = (counts[sid] ?? 0) + 1;
    counts[did] = (counts[did] ?? 0) + 1;
  }
  res.json(counts);
});

// GET /matches (paginated, with optional entryId filter)
router.get("/matches", async (req, res) => {
  const { resinCategory } = req.query as { resinCategory?: string };
  const entryId = req.query.entryId ? parseInt(req.query.entryId as string, 10) : null;
  const limit = Math.min(parseInt((req.query.limit as string) ?? "50", 10), 200);
  const offset = parseInt((req.query.offset as string) ?? "0", 10);

  const all = await getOrComputeAllMatches();
  let filtered = resinCategory ? all.filter(m => (m.source as any).resinCategory === resinCategory) : all;
  if (entryId !== null && Number.isFinite(entryId)) {
    filtered = filtered.filter(m => (m.source as any).id === entryId || (m.demand as any).id === entryId);
  }
  const items = filtered.slice(offset, offset + limit);
  res.json({ total: filtered.length, items });
});

export default router;
