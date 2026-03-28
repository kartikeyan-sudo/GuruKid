import { Router } from "express";
import { adminDeleteUser, adminLogin, adminSession, adminUsers } from "../controllers/adminController.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

router.post("/login", adminLogin);
router.get("/session", requireAdmin, adminSession);
router.get("/users", requireAdmin, adminUsers);
router.delete("/users/:userId", requireAdmin, adminDeleteUser);

export default router;
