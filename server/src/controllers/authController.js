import {
  loginUser,
  registerUser,
  signUserToken,
  touchDevice,
} from "../services/authStore.js";

export async function register(req, res) {
  try {
    const { email, password, nickname, deviceKey } = req.body || {};
    const user = await registerUser({ email, password, nickname, deviceKey });

    const token = signUserToken({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
    });

    return res.json({
      token,
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
      deviceKey,
    });
  } catch (err) {
    const status = /required|already/i.test(err.message || "") ? 400 : 500;
    return res.status(status).json({ error: err.message || "Registration failed" });
  }
}

export async function login(req, res) {
  try {
    const { email, password, deviceKey } = req.body || {};
    const user = await loginUser({ email, password, deviceKey });

    const token = signUserToken({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
    });

    return res.json({
      token,
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
      deviceKey,
    });
  } catch (err) {
    const status = /mismatch|invalid/i.test(err.message || "") ? 401 : 500;
    return res.status(status).json({ error: err.message || "Login failed" });
  }
}

export async function me(req, res) {
  await touchDevice({ userId: req.user.userId, deviceKey: req.user.deviceKey });
  return res.json({
    userId: req.user.userId,
    email: req.user.email,
    nickname: req.user.nickname,
    deviceKey: req.user.deviceKey,
  });
}
