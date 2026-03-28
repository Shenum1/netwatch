import { Router } from "express";
import axios from "axios";
import FormData from "form-data";
import multer from "multer";

const router  = Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100_000 } });
const ML_URL  = () => process.env.ML_SERVICE_URL || "http://ml_core:8000";

router.get("/list", async (req, res) => {
  const { data } = await axios.get(`${ML_URL()}/api/scripts/list`);
  res.json(data);
});

router.post("/reload", async (req, res) => {
  const { data } = await axios.post(`${ML_URL()}/api/scripts/reload`);
  res.json(data);
});

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided" });
  const form = new FormData();
  form.append("file", req.file.buffer, { filename: req.file.originalname, contentType: "text/x-python" });
  const { data } = await axios.post(`${ML_URL()}/api/scripts/upload`, form, {
    headers: form.getHeaders(),
  });
  res.json(data);
});

router.delete("/:name", async (req, res) => {
  const { data } = await axios.delete(`${ML_URL()}/api/scripts/${req.params.name}`);
  res.json(data);
});

export default router;
