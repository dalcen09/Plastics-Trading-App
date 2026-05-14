import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import resinEntriesRouter from "./resinEntries.js";
import importExcelRouter from "./importExcel.js";
import storageRouter from "./storage.js";
import authRouter from "./auth.js";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(resinEntriesRouter);
router.use(importExcelRouter);
router.use(storageRouter);

export default router;
