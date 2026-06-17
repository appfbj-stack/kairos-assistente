import { Router } from "express";
import empresasRouter from "./empresas.js";
import usersRouter from "./users.js";
import modulesRouter from "./modules.js";
import licensesRouter from "./licenses.js";

const router = Router();

router.use("/empresas", empresasRouter);
router.use("/users", usersRouter);
router.use("/modules", modulesRouter);
router.use("/licenses", licensesRouter);

export default router;
export { expireOverdueTrials } from "./licenses.js";
export { bootstrapSuperAdmin } from "./bootstrap.js";
