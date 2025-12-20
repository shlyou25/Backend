const express = require("express");
const router = express.Router();

const authController = require("./Controllers/auth");
const authenticate = require("./Controllers/authenticate");
const passwordChangeAuth = require('../middlewares/passwordChangeAuth')
router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authenticate.authenticate, authController.me);
router.post("/logout", authenticate.authenticate, authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get('/authenticate',authenticate.authenticate)
router.post(
  "/change-password",
  passwordChangeAuth,
  authController.changePassword
);

router.post("/admin/verify-otp", authController.verifyAdminOtp);

module.exports = router;
