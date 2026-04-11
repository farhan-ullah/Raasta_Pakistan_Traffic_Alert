import { Router, type IRouter } from "express";
import healthRouter from "./health";
import incidentsRouter from "./incidents";
import merchantsRouter from "./merchants";
import offersRouter from "./offers";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(incidentsRouter);
router.use(merchantsRouter);
router.use(offersRouter);
router.use(dashboardRouter);

export default router;
