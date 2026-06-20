import { Router } from "express";
import dashboardRouter from "./dashboard.js";
import assistantsRouter from "./assistants.js";
import knowledgeRouter from "./knowledge.js";
import conversationsRouter from "./conversations.js";
import chatRouter from "./chat.js";
import leadsRouter from "./leads.js";
import configsRouter from "./configs.js";
import reportsRouter from "./reports.js";
import publicRouter from "./public.js";

const router = Router();

router.use("/public", publicRouter);
router.use("/dashboard", dashboardRouter);
router.use("/assistants", assistantsRouter);
router.use("/knowledge", knowledgeRouter);
router.use("/conversations", conversationsRouter);
router.use("/chat", chatRouter);
router.use("/leads", leadsRouter);
router.use("/configs", configsRouter);
router.use("/reports", reportsRouter);

export default router;
