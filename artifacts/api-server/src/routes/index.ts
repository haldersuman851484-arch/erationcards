import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ordersRouter from "./orders";
import operatorsRouter from "./operators";
import adminRouter from "./admin";
import paymentsRouter from "./payments";
import cardPdfsRouter from "./card-pdfs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ordersRouter);
router.use(operatorsRouter);
router.use(adminRouter);
router.use(paymentsRouter);
router.use(cardPdfsRouter);

export default router;
