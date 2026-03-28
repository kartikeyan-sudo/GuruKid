import { validateUserDevice, verifyUserToken } from "../services/authStore.js";

export async function requireUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const deviceKey = req.headers["x-device-key"] || req.body?.deviceKey || req.query?.deviceKey;

    if (!token || !deviceKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = verifyUserToken(token);
    if (!payload?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const isValid = await validateUserDevice({ userId: payload.userId, deviceKey });
    if (!isValid) {
      return res.status(403).json({ error: "Device access denied" });
    }

    req.user = {
      userId: payload.userId,
      email: payload.email,
      nickname: payload.nickname,
      deviceKey,
    };

    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
