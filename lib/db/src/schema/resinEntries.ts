import { pgTable, serial, text, boolean, numeric, date, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resinCategoryEnum = pgEnum("resin_category", ["virgin", "offgrade", "recycled"]);
export const entryTypeEnum = pgEnum("entry_type", ["source", "demand"]);
export const resinTypeEnum = pgEnum("resin_type", [
  "PP", "PE", "PS", "ABS", "PVC", "PET", "PC", "PA6", "PA66", "EVA", "PMMA",
  "HDPE", "LDPE", "LLDPE",
  "GPPS", "HIPS",
  "POM", "EPDM", "PEI", "PETG", "AS", "MS", "PVDC",
  "Other",
]);
export const ppTypeEnum = pgEnum("pp_type", ["ホモ", "ブロック", "ランダム"]);
export const peTypeEnum = pgEnum("pe_type", ["LD", "HD", "LLD"]);
export const psTypeEnum = pgEnum("ps_type", ["HI", "GP"]);
export const absTypeEnum = pgEnum("abs_type", ["難燃"]);
export const packagingTypeEnum = pgEnum("packaging_type", ["紙袋", "フレコン", "カートン", "鉄箱", "ポリ袋"]);
export const quantityTypeEnum = pgEnum("quantity_type", ["月間", "スポット"]);

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
  otherResinType: text("other_resin_type"),
  ppType: ppTypeEnum("pp_type"),
  peType: peTypeEnum("pe_type"),
  psType: psTypeEnum("ps_type"),
  absType: absTypeEnum("abs_type"),
  isClosed: text("is_closed").default("オープン").notNull(),
  sampleAvailable: text("sample_available"),
  packaging: packagingTypeEnum("packaging"),
  meltFlowIndexLower: numeric("melt_flow_index_lower", { precision: 10, scale: 4 }),
  meltFlowIndexUpper: numeric("melt_flow_index_upper", { precision: 10, scale: 4 }),
  charpyLower: numeric("charpy_lower", { precision: 10, scale: 4 }),
  charpyUpper: numeric("charpy_upper", { precision: 10, scale: 4 }),
  izodLower: numeric("izod_lower", { precision: 10, scale: 4 }),
  izodUpper: numeric("izod_upper", { precision: 10, scale: 4 }),
  densityLower: numeric("density_lower", { precision: 10, scale: 4 }),
  densityUpper: numeric("density_upper", { precision: 10, scale: 4 }),
  price: numeric("price", { precision: 12, scale: 2 }),
  priceLower: numeric("price_lower", { precision: 12, scale: 2 }),
  priceUpper: numeric("price_upper", { precision: 12, scale: 2 }),
  quantity: numeric("quantity", { precision: 12, scale: 2 }),
  quantityLower: numeric("quantity_lower", { precision: 12, scale: 2 }),
  quantityUpper: numeric("quantity_upper", { precision: 12, scale: 2 }),
  quantityType: quantityTypeEnum("quantity_type"),
  remarks: text("remarks"),
  // Extended fields from Japanese spreadsheets
  locationType: text("location_type"),
  storageLocation: text("storage_location"),       // 他県置場
  arrivalPrice: numeric("arrival_price", { precision: 12, scale: 2 }), // 丸喜着
  spotPrice: numeric("spot_price", { precision: 12, scale: 2 }),       // スポット
  prospectiveBuyer: text("prospective_buyer"),     // ワーク希望者
  desiredQuantity: numeric("desired_quantity", { precision: 12, scale: 2 }), // 希望数量
  proposedTo: text("proposed_to"),                 // 提案先
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }), // 販売価格
  packagingWeight: numeric("packaging_weight", { precision: 12, scale: 2 }),
  plainMaker: text("plain_maker"),
  usageType: text("usage_type"),
  finalNegotiatedPrice: numeric("final_negotiated_price", { precision: 12, scale: 2 }),
  origin: text("origin"),
  colorTone: text("color_tone"),
  imageUrl: text("image_url"),
  imageUrls: text("image_urls").array(),
  tdsUrl: text("tds_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const insertResinEntrySchema = createInsertSchema(resinEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResinEntry = z.infer<typeof insertResinEntrySchema>;
export type ResinEntry = typeof resinEntriesTable.$inferSelect;

export const staffTable = pgTable("staff", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const prospectiveBuyersTable = pgTable("prospective_buyers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});
