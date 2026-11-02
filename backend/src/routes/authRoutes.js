const express = require("express");
const { login, logout, me, loginLimiter } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { loginSchema } = require("../validators/authValidators");

const router = express.Router();

router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/logout", logout);
router.get("/me", authenticate, me);

module.exports = router;
