import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import ordersRouter from "./orders";
import shipmentsRouter from "./shipments";
import usersRouter from "./users";
import dashboardRouter from "./dashboard";
import messagesRouter from "./messages";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(shipmentsRouter);
router.use(usersRouter);
router.use(dashboardRouter);
router.use(messagesRouter);

export default router;
