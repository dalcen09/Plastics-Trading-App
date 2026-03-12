import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { resinEntriesTable } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
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

function toNumber(val: string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function serializeEntry(entry: typeof resinEntriesTable.$inferSelect) {
  return {
    ...entry,
    meltFlowIndex: toNumber(entry.meltFlowIndex),
    charpy: toNumber(entry.charpy),
    izod: toNumber(entry.izod),
    density: toNumber(entry.density),
    price: toNumber(entry.price),
    quantity: toNumber(entry.quantity),
    arrivalPrice: toNumber(entry.arrivalPrice),
    spotPrice: toNumber(entry.spotPrice),
    sellingPrice: toNumber(entry.sellingPrice),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

// ---- SOURCES ----

router.get("/sources", async (req, res) => {
  const query = ListSourcesQueryParams.parse(req.query);
  const conditions = [eq(resinEntriesTable.entryType, "source")];
  if (query.resinCategory) {
    conditions.push(eq(resinEntriesTable.resinCategory, query.resinCategory));
  }
  const rows = await db.select().from(resinEntriesTable).where(and(...conditions)).orderBy(resinEntriesTable.date);
  res.json(rows.map(serializeEntry));
});

router.post("/sources", async (req, res) => {
  const body = CreateSourceBody.parse(req.body);
  const [row] = await db.insert(resinEntriesTable).values({
    ...body,
    entryType: "source",
    meltFlowIndex: body.meltFlowIndex?.toString(),
    charpy: body.charpy?.toString(),
    izod: body.izod?.toString(),
    density: body.density?.toString(),
    price: body.price?.toString(),
    quantity: body.quantity?.toString(),
  }).returning();
  res.status(201).json(serializeEntry(row));
});

router.put("/sources/:id", async (req, res) => {
  const { id } = UpdateSourceParams.parse(req.params);
  const body = UpdateSourceBody.parse(req.body);
  const [row] = await db.update(resinEntriesTable).set({
    ...body,
    meltFlowIndex: body.meltFlowIndex?.toString(),
    charpy: body.charpy?.toString(),
    izod: body.izod?.toString(),
    density: body.density?.toString(),
    price: body.price?.toString(),
    quantity: body.quantity?.toString(),
    updatedAt: new Date(),
  }).where(and(eq(resinEntriesTable.id, id), eq(resinEntriesTable.entryType, "source"))).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(serializeEntry(row));
});

router.delete("/sources/:id", async (req, res) => {
  const { id } = DeleteSourceParams.parse(req.params);
  await db.delete(resinEntriesTable).where(and(eq(resinEntriesTable.id, id), eq(resinEntriesTable.entryType, "source")));
  res.status(204).end();
});

router.post("/sources/batch-delete", async (req, res) => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
  if (ids.length === 0) return res.status(204).end();
  await db.delete(resinEntriesTable).where(and(inArray(resinEntriesTable.id, ids), eq(resinEntriesTable.entryType, "source")));
  res.status(204).end();
});

// ---- DEMANDS ----

router.get("/demands", async (req, res) => {
  const query = ListDemandsQueryParams.parse(req.query);
  const conditions = [eq(resinEntriesTable.entryType, "demand")];
  if (query.resinCategory) {
    conditions.push(eq(resinEntriesTable.resinCategory, query.resinCategory));
  }
  const rows = await db.select().from(resinEntriesTable).where(and(...conditions)).orderBy(resinEntriesTable.date);
  res.json(rows.map(serializeEntry));
});

router.post("/demands", async (req, res) => {
  const body = CreateDemandBody.parse(req.body);
  const [row] = await db.insert(resinEntriesTable).values({
    ...body,
    entryType: "demand",
    meltFlowIndex: body.meltFlowIndex?.toString(),
    charpy: body.charpy?.toString(),
    izod: body.izod?.toString(),
    density: body.density?.toString(),
    price: body.price?.toString(),
    quantity: body.quantity?.toString(),
  }).returning();
  res.status(201).json(serializeEntry(row));
});

router.put("/demands/:id", async (req, res) => {
  const { id } = UpdateDemandParams.parse(req.params);
  const body = UpdateDemandBody.parse(req.body);
  const [row] = await db.update(resinEntriesTable).set({
    ...body,
    meltFlowIndex: body.meltFlowIndex?.toString(),
    charpy: body.charpy?.toString(),
    izod: body.izod?.toString(),
    density: body.density?.toString(),
    price: body.price?.toString(),
    quantity: body.quantity?.toString(),
    updatedAt: new Date(),
  }).where(and(eq(resinEntriesTable.id, id), eq(resinEntriesTable.entryType, "demand"))).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(serializeEntry(row));
});

router.delete("/demands/:id", async (req, res) => {
  const { id } = DeleteDemandParams.parse(req.params);
  await db.delete(resinEntriesTable).where(and(eq(resinEntriesTable.id, id), eq(resinEntriesTable.entryType, "demand")));
  res.status(204).end();
});

router.post("/demands/batch-delete", async (req, res) => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
  if (ids.length === 0) return res.status(204).end();
  await db.delete(resinEntriesTable).where(and(inArray(resinEntriesTable.id, ids), eq(resinEntriesTable.entryType, "demand")));
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
  const sources = await db.select().from(resinEntriesTable).where(eq(resinEntriesTable.entryType, "source"));
  const demands = await db.select().from(resinEntriesTable).where(eq(resinEntriesTable.entryType, "demand"));

  const matches: Array<{ source: object; demand: object; score: number; reasons: string[] }> = [];

  for (const source of sources) {
    for (const demand of demands) {
      const reasons: string[] = [];
      let score = 0;

      // Must match resin category and type
      if (source.resinCategory !== demand.resinCategory) continue;
      if (source.resinType !== demand.resinType) continue;

      reasons.push(`Same resin category: ${source.resinCategory}`);
      reasons.push(`Same resin type: ${source.resinType}`);
      score += 40;

      // Grade match
      if (source.grade && demand.grade) {
        if (source.grade.toLowerCase() === demand.grade.toLowerCase()) {
          reasons.push(`Matching grade: ${source.grade}`);
          score += 20;
        }
      }

      // Manufacturer match
      if (source.manufacturer && demand.manufacturer) {
        if (source.manufacturer.toLowerCase() === demand.manufacturer.toLowerCase()) {
          reasons.push(`Same manufacturer: ${source.manufacturer}`);
          score += 10;
        }
      }

      // MFI match (within 20%)
      const srcMFI = toNum(source.meltFlowIndex);
      const dmMFI = toNum(demand.meltFlowIndex);
      if (withinTolerance(srcMFI, dmMFI, 0.2)) {
        reasons.push(`Compatible MFI: ${srcMFI} vs ${dmMFI} g/10min`);
        score += 10;
      }

      // Density match (within 5%)
      const srcDen = toNum(source.density);
      const dmDen = toNum(demand.density);
      if (withinTolerance(srcDen, dmDen, 0.05)) {
        reasons.push(`Compatible density: ${srcDen} vs ${dmDen} g/cm³`);
        score += 10;
      }

      // PP type match (if applicable)
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
