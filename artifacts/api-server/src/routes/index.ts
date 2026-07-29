import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ordersRouter from "./orders";
import operatorsRouter from "./operators";
import adminRouter from "./admin";
import ordersArchiveRouter from "./orders-archive";
import paymentsRouter from "./payments";
import cardPdfsRouter from "./card-pdfs";
import reviewsRouter from "./reviews";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ordersRouter);
router.use(operatorsRouter);
router.use(adminRouter);
router.use(ordersArchiveRouter);
router.use(paymentsRouter);
router.use(cardPdfsRouter);
router.use(reviewsRouter);

export default router;
