import { Router, type IRouter } from "express";
import healthRouter from "./health";
import resinEntriesRouter from "./resinEntries";
import importExcelRouter from "./importExcel";
import storageRouter from "./storage";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(resinEntriesRouter);
router.use(importExcelRouter);
router.use(storageRouter);

export default router;
