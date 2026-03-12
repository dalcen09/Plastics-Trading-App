import { pgTable, serial, text, boolean, numeric, date, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resinCategoryEnum = pgEnum("resin_category", ["virgin", "offgrade", "recycled"]);
export const entryTypeEnum = pgEnum("entry_type", ["source", "demand"]);
export const resinTypeEnum = pgEnum("resin_type", ["PP", "PE", "PS", "ABS", "PVC", "PET", "PC", "Nylon", "EVA", "PMMA", "Other"]);
export const ppTypeEnum = pgEnum("pp_type", ["Homopolymer", "Copolymer", "Random", "Impact", "Terpolymer", "N/A"]);
export const packagingTypeEnum = pgEnum("packaging_type", ["Bags", "Octabin", "Bulk", "Jumbo_Bag", "Box", "Other"]);

export const resinEntriesTable = pgTable("resin_entries", {
  id: serial("id").primaryKey(),
  entryType: entryTypeEnum("entry_type").notNull(),
  resinCategory: resinCategoryEnum("resin_category").notNull(),
  date: date("date").notNull(),
  counterparty: text("counterparty").notNull(),
  personInCharge: text("person_in_charge").notNull(),
  resinType: resinTypeEnum("resin_type").notNull(),
  manufacturer: text("manufacturer"),
  grade: text("grade"),
  ppType: ppTypeEnum("pp_type"),
  sampleAvailable: boolean("sample_available"),
  packaging: packagingTypeEnum("packaging"),
  meltFlowIndex: numeric("melt_flow_index", { precision: 10, scale: 4 }),
  charpy: numeric("charpy", { precision: 10, scale: 4 }),
  izod: numeric("izod", { precision: 10, scale: 4 }),
  density: numeric("density", { precision: 10, scale: 4 }),
  price: numeric("price", { precision: 12, scale: 2 }),
  quantity: numeric("quantity", { precision: 12, scale: 2 }),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertResinEntrySchema = createInsertSchema(resinEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResinEntry = z.infer<typeof insertResinEntrySchema>;
export type ResinEntry = typeof resinEntriesTable.$inferSelect;
