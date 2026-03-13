import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { resinEntriesTable, staffTable, prospectiveBuyersTable } from "@workspace/db/schema";
import { eq, and, inArray, isNull, isNotNull } from "drizzle-orm";
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

// GET /api/persons-in-charge — managed staff list
router.get("/persons-in-charge", async (_req, res) => {
  const rows = await db.select({ name: staffTable.name }).from(staffTable).orderBy(staffTable.name);
  res.json(rows.map(r => r.name));
});

// GET /api/prospective-buyers — managed prospective buyer list
router.get("/prospective-buyers", async (_req, res) => {
  const rows = await db.select({ name: prospectiveBuyersTable.name }).from(prospectiveBuyersTable).orderBy(prospectiveBuyersTable.name);
  res.json(rows.map(r => r.name));
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
    charpy: toNumber(entry.charpy),
    izod: toNumber(entry.izod),
    density: toNumber(entry.density),
    price: toNumber(entry.price),
    storageLocation: entry.storageLocation,
    imageUrls: entry.imageUrls ?? [],
    tdsUrl: entry.tdsUrl,
    quantity: toNumber(entry.quantity),
    arrivalPrice: toNumber(entry.arrivalPrice),
    spotPrice: toNumber(entry.spotPrice),
    desiredQuantity: toNumber(entry.desiredQuantity),
    sellingPrice: toNumber(entry.sellingPrice),
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
    charpy: body.charpy?.toString(),
    izod: body.izod?.toString(),
    density: body.density?.toString(),
    price: body.price?.toString(),
      storageLocation: body.storageLocation ?? null,
      imageUrls: body.imageUrls ?? null,
      tdsUrl: body.tdsUrl ?? null,
    quantity: body.quantity?.toString(),
  }).returning();
  res.status(201).json(serializeEntry(row));
});

router.put("/sources/:id", async (req, res) => {
  const { id } = UpdateSourceParams.parse(req.params);
  const body = UpdateSourceBody.parse(req.body);
  const [row] = await db.update(resinEntriesTable).set({
    ...body,
    meltFlowIndexLower: body.meltFlowIndexLower?.toString(),
    meltFlowIndexUpper: body.meltFlowIndexUpper?.toString(),
    charpy: body.charpy?.toString(),
    izod: body.izod?.toString(),
    density: body.density?.toString(),
    price: body.price?.toString(),
      storageLocation: body.storageLocation ?? null,
      imageUrls: body.imageUrls ?? null,
      tdsUrl: body.tdsUrl ?? null,
    quantity: body.quantity?.toString(),
    updatedAt: new Date(),
  }).where(and(eq(resinEntriesTable.id, id), eq(resinEntriesTable.entryType, "source"), isNull(resinEntriesTable.deletedAt))).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(serializeEntry(row));
});

// Soft delete single source
router.delete("/sources/:id", async (req, res) => {
  const { id } = DeleteSourceParams.parse(req.params);
  await db.update(resinEntriesTable)
    .set({ deletedAt: new Date() })
    .where(and(eq(resinEntriesTable.id, id), eq(resinEntriesTable.entryType, "source"), isNull(resinEntriesTable.deletedAt)));
  res.status(204).end();
});

// Soft batch-delete sources
router.post("/sources/batch-delete", async (req, res) => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
  if (ids.length === 0) return res.status(204).end();
  await db.update(resinEntriesTable)
    .set({ deletedAt: new Date() })
    .where(and(inArray(resinEntriesTable.id, ids), eq(resinEntriesTable.entryType, "source"), isNull(resinEntriesTable.deletedAt)));
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
    charpy: body.charpy?.toString(),
    izod: body.izod?.toString(),
    density: body.density?.toString(),
    price: body.price?.toString(),
      storageLocation: body.storageLocation ?? null,
      imageUrls: body.imageUrls ?? null,
      tdsUrl: body.tdsUrl ?? null,
    quantity: body.quantity?.toString(),
  }).returning();
  res.status(201).json(serializeEntry(row));
});

router.put("/demands/:id", async (req, res) => {
  const { id } = UpdateDemandParams.parse(req.params);
  const body = UpdateDemandBody.parse(req.body);
  const [row] = await db.update(resinEntriesTable).set({
    ...body,
    meltFlowIndexLower: body.meltFlowIndexLower?.toString(),
    meltFlowIndexUpper: body.meltFlowIndexUpper?.toString(),
    charpy: body.charpy?.toString(),
    izod: body.izod?.toString(),
    density: body.density?.toString(),
    price: body.price?.toString(),
      storageLocation: body.storageLocation ?? null,
      imageUrls: body.imageUrls ?? null,
      tdsUrl: body.tdsUrl ?? null,
    quantity: body.quantity?.toString(),
    updatedAt: new Date(),
  }).where(and(eq(resinEntriesTable.id, id), eq(resinEntriesTable.entryType, "demand"), isNull(resinEntriesTable.deletedAt))).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(serializeEntry(row));
});

// Soft delete single demand
router.delete("/demands/:id", async (req, res) => {
  const { id } = DeleteDemandParams.parse(req.params);
  await db.update(resinEntriesTable)
    .set({ deletedAt: new Date() })
    .where(and(eq(resinEntriesTable.id, id), eq(resinEntriesTable.entryType, "demand"), isNull(resinEntriesTable.deletedAt)));
  res.status(204).end();
});

// Soft batch-delete demands
router.post("/demands/batch-delete", async (req, res) => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
  if (ids.length === 0) return res.status(204).end();
  await db.update(resinEntriesTable)
    .set({ deletedAt: new Date() })
    .where(and(inArray(resinEntriesTable.id, ids), eq(resinEntriesTable.entryType, "demand"), isNull(resinEntriesTable.deletedAt)));
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
  res.json(serializeEntry(row));
});

// DELETE /api/trash/:id — permanently delete a single entry
router.delete("/trash/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(resinEntriesTable)
    .where(and(eq(resinEntriesTable.id, id), isNotNull(resinEntriesTable.deletedAt)));
  res.status(204).end();
});

// POST /api/trash/batch-restore — restore multiple entries
router.post("/trash/batch-restore", async (req, res) => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
  if (ids.length === 0) return res.status(204).end();
  await db.update(resinEntriesTable)
    .set({ deletedAt: null })
    .where(and(inArray(resinEntriesTable.id, ids), isNotNull(resinEntriesTable.deletedAt)));
  res.status(204).end();
});

// DELETE /api/trash/batch-purge — permanently delete multiple entries
router.delete("/trash/batch-purge", async (req, res) => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
  if (ids.length === 0) return res.status(204).end();
  await db.delete(resinEntriesTable)
    .where(and(inArray(resinEntriesTable.id, ids), isNotNull(resinEntriesTable.deletedAt)));
  res.status(204).end();
});

// ---- MATCHES ----

function toNum(val: string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function withinTolerance(a: number | null, b: number | null, pct: number): boolean {
  if (a === null || b === null) return false;
  if (a === 0 && b === 0) return true;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) <= pct;
}

router.get("/matches", async (req, res) => {
  const sources = await db.select().from(resinEntriesTable).where(and(eq(resinEntriesTable.entryType, "source"), isNull(resinEntriesTable.deletedAt)));
  const demands = await db.select().from(resinEntriesTable).where(and(eq(resinEntriesTable.entryType, "demand"), isNull(resinEntriesTable.deletedAt)));

  const matches: Array<{ source: object; demand: object; score: number; reasons: string[] }> = [];

  for (const source of sources) {
    for (const demand of demands) {
      const reasons: string[] = [];
      let score = 0;

      if (source.resinCategory !== demand.resinCategory) continue;
      if (source.resinType !== demand.resinType) continue;

      reasons.push(`Same resin category: ${source.resinCategory}`);
      reasons.push(`Same resin type: ${source.resinType}`);
      score += 40;

      if (source.grade && demand.grade) {
        if (source.grade.toLowerCase() === demand.grade.toLowerCase()) {
          reasons.push(`Matching grade: ${source.grade}`);
          score += 20;
        }
      }

      if (source.manufacturer && demand.manufacturer) {
        if (source.manufacturer.toLowerCase() === demand.manufacturer.toLowerCase()) {
          reasons.push(`Same manufacturer: ${source.manufacturer}`);
          score += 10;
        }
      }

      const srcLo = toNum(source.meltFlowIndexLower), srcHi = toNum(source.meltFlowIndexUpper);
      const dmLo = toNum(demand.meltFlowIndexLower), dmHi = toNum(demand.meltFlowIndexUpper);
      const srcMid = srcLo !== null ? (srcHi !== null ? (srcLo + srcHi) / 2 : srcLo) : srcHi;
      const dmMid = dmLo !== null ? (dmHi !== null ? (dmLo + dmHi) / 2 : dmLo) : dmHi;
      if (srcMid !== null && dmMid !== null && withinTolerance(srcMid, dmMid, 0.2)) {
        reasons.push(`Compatible MFI: ${srcMid} vs ${dmMid} g/10min`);
        score += 10;
      }

      const srcDen = toNum(source.density);
      const dmDen = toNum(demand.density);
      if (withinTolerance(srcDen, dmDen, 0.05)) {
        reasons.push(`Compatible density: ${srcDen} vs ${dmDen} g/cm³`);
        score += 10;
      }

      if (source.resinType === "PP" && source.ppType && demand.ppType) {
        if (source.ppType === demand.ppType) {
          reasons.push(`Same PP type: ${source.ppType}`);
          score += 10;
        }
      }

      if (score >= 40) {
        matches.push({
          source: serializeEntry(source),
          demand: serializeEntry(demand),
          score: Math.min(score, 100),
          reasons,
        });
      }
    }
  }

  matches.sort((a, b) => b.score - a.score);
  res.json(matches);
});

export default router;
