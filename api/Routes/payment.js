const express = require("express");
const router = express.Router();
const {authenticate} = require("../middlewares/authenticate");
const paymentController = require("./Controllers/paymentController");

// These Two are the actual routes which are commented for Now
router.post("/create-intent",authenticate,paymentController.createPaymentIntent); 
router.post("/confirm",authenticate,paymentController.confirmPayment);
module.exports = router;
