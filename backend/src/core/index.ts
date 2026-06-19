import { Router } from "express";
import empresasRouter from "./empresas.js";
import usersRouter from "./users.js";
import modulesRouter from "./modules.js";
import agentsRouter from "./agents.js";
import licensesRouter from "./licenses.js";
import supervisorRouter from "./supervisor.js";

const router = Router();

router.use("/empresas", empresasRouter);
router.use("/users", usersRouter);
router.use("/modules", modulesRouter);
router.use("/agents", agentsRouter);
router.use("/licenses", licensesRouter);
router.use("/supervisor", supervisorRouter);

export default router;
export { expireOverdueTrials } from "./licenses.js";
export { bootstrapSuperAdmin, bootstrapModules, bootstrapAgents } from "./bootstrap.js";
