import { Router } from "express";
import axios from "axios";
import { requireRole } from "../middleware/auth.js";

const router = Router();
const ML_URL = () => process.env.ML_SERVICE_URL || "http://ml_core:8000";

router.get("/status", async (req, res) => {
  const { data } = await axios.get(`${ML_URL()}/api/model/status`);
  res.json(data);
});

router.get("/report", async (req, res) => {
  const { data } = await axios.get(`${ML_URL()}/api/model/report`);
  res.json(data);
});

// Admin only — training changes the model for all users
router.post("/train", requireRole("admin"), async (req, res) => {
  const { data } = await axios.post(`${ML_URL()}/api/model/train`, req.body);
  res.json(data);
});

export default router;
