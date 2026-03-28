import { ADMIN_TOKEN } from "../middleware/adminAuth.js";
import { listUsers } from "../services/authStore.js";
import { wipeUserDataThenDeleteUser } from "../services/adminDeletionService.js";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export function adminLogin(req, res) {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  return res.json({
    token: ADMIN_TOKEN,
    admin: { username: ADMIN_USERNAME },
  });
}

export function adminSession(req, res) {
  return res.json({ ok: true, admin: { username: ADMIN_USERNAME } });
}

export async function adminUsers(req, res) {
  try {
    const users = await listUsers();
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to fetch users" });
  }
}

export async function adminDeleteUser(req, res) {
  try {
    const userId = req.params.userId;
    const deviceId = req.body?.deviceId;
    const result = await wipeUserDataThenDeleteUser({ userId, deviceId });
    return res.json(result);
  } catch (err) {
    const notFound = (err?.message || "").toLowerCase().includes("not found");
    return res.status(notFound ? 404 : 409).json({ error: err.message || "Delete failed" });
  }
}
