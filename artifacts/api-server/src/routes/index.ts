import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ordersRouter from "./orders";
import operatorsRouter from "./operators";
import adminRouter from "./admin";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ordersRouter);
router.use(operatorsRouter);
router.use(adminRouter);
router.use(paymentsRouter);

export default router;
