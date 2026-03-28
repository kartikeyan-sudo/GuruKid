import { Router } from "express";
import { login, me, register } from "../controllers/authController.js";
import { requireUser } from "../middleware/userAuth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireUser, me);

export default router;
