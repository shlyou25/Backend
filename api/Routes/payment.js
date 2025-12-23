const express = require("express");
const router = express.Router();
const {authenticate} = require("../middlewares/authenticate");
const paymentController = require("./Controllers/paymentController");

router.post("/create-intent",authenticate,paymentController.createPaymentIntent); 
router.post("/confirm",authenticate,paymentController.confirmPayment);
module.exports = router;
