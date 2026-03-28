import { Router } from "express";
import { sendCommand } from "../controllers/commandController.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

router.post("/", requireAdmin, sendCommand);

export default router;
