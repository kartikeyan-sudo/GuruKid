import { Router } from "express";
import {
  registerDeviceHttp,
  listDevices,
  getDeviceById,
  pushStatus,
  blockDevice,
  unblockDevice,
  removeDevice,
  clearHistory,
} from "../controllers/deviceController.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

router.post("/register", registerDeviceHttp);
router.post("/:id/status", pushStatus);
router.get("/", requireAdmin, listDevices);
router.get("/:id", requireAdmin, getDeviceById);
router.patch("/:id/block", requireAdmin, blockDevice);
router.patch("/:id/unblock", requireAdmin, unblockDevice);
router.post("/:id/history/clear", requireAdmin, clearHistory);
router.delete("/:id", requireAdmin, removeDevice);

export default router;
