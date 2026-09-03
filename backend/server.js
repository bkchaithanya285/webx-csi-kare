require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { v2: cloudinary } = require("cloudinary");

const app = express();
const PORT = process.env.PORT || 5000;

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middleware
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Allow any Vercel preview/production deployment or specified origins
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for hackathon portal access
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// High payload limit for image/screenshot uploads
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// Health Check Endpoints (Critical for Render deployment)
app.get("/", (req, res) => {
  res.status(200).json({
    status: "online",
    service: "WEBX 2026 Hackathon Backend",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", uptime: process.uptime() });
});

// Cloudinary Image Upload API
app.post("/api/upload", async (req, res) => {
  try {
    const { image, teamId } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image payload provided" });
    }

    const cleanTeamId = (teamId || "WEB-TEAM").trim().toUpperCase();
    const publicId = `${cleanTeamId}_payment_screenshot_${Date.now()}`;

    const uploadRes = await cloudinary.uploader.upload(image, {
      folder: "webx_payment_proofs",
      public_id: publicId,
      overwrite: true,
      resource_type: "image",
    });

    return res.status(200).json({
      success: true,
      url: uploadRes.secure_url,
      publicId: uploadRes.public_id,
    });
  } catch (err) {
    console.error("Cloudinary upload error on backend:", err);
    return res.status(500).json({
      error: err.message || "Failed to upload image to Cloudinary",
    });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Backend Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[WEBX Backend] Service running on http://0.0.0.0:${PORT}`);
});
