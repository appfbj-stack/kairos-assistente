import { Router } from "express";
import servicesRouter from "./services.js";
import professionalsRouter from "./professionals.js";
import clientsRouter from "./clients.js";
import appointmentsRouter from "./appointments.js";
import publicRouter from "./public.js";
import iaRouter from "./ia.js";

const router = Router();

// Sem auth — consultado pelo link público de agendamento (ex: enviado via WhatsApp)
router.use("/public", publicRouter);

// Com auth do Core (JWT) — painel de gestão da barbearia
router.use("/services", servicesRouter);
router.use("/professionals", professionalsRouter);
router.use("/clients", clientsRouter);
router.use("/appointments", appointmentsRouter);
router.use("/ia", iaRouter);

export default router;
