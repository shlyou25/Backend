const express = require("express");
const router = express.Router();
const controller = require("./Controllers/communicationController");

router.post("/send-email", controller.sendEmailToSeller);

router.post(
  "/mailgun/inbound",
  express.urlencoded({ extended: false }), // Mailgun sends form data
  controller.mailgunInbound
);

module.exports = router;
