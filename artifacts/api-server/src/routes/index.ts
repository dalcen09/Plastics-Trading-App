import { Router, type IRouter } from "express";
import healthRouter from "./health";
import resinEntriesRouter from "./resinEntries";
import importExcelRouter from "./importExcel";

const router: IRouter = Router();

router.use(healthRouter);
router.use(resinEntriesRouter);
router.use(importExcelRouter);

export default router;
