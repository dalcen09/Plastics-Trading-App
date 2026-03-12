import { Router, type IRouter } from "express";
import healthRouter from "./health";
import resinEntriesRouter from "./resinEntries";

const router: IRouter = Router();

router.use(healthRouter);
router.use(resinEntriesRouter);

export default router;
