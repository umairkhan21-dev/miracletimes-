const express = require("express");
const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const articleRoutes = require("./articleRoutes");
const categoryRoutes = require("./categoryRoutes");
const mediaRoutes = require("./mediaRoutes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/articles", articleRoutes);
router.use("/categories", categoryRoutes);
router.use("/media", mediaRoutes);

module.exports = router;
