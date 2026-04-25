import { Router, type IRouter } from "express";
import healthRouter from "./health";
import incidentsRouter from "./incidents";
import merchantsRouter from "./merchants";
import offersRouter from "./offers";
import dashboardRouter from "./dashboard";
import authRouter from "./auth";
import geocodeRouter from "./geocode";
import routingRouter from "./routing";
import announcementsRouter from "./announcements";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(geocodeRouter);
router.use(routingRouter);
router.use(authRouter);
router.use(incidentsRouter);
router.use(merchantsRouter);
router.use(offersRouter);
router.use(dashboardRouter);
router.use(announcementsRouter);
router.use(usersRouter);

export default router;
