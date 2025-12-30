const express = require("express");
const router = express.Router();
const faqController = require("./Controllers/faqcontroller");
const { authenticate, isAdmin } = require('../middlewares/authenticate');


router.get("/", faqController.getAllFaqs);
router.post("/create", authenticate, isAdmin, faqController.createFaq);
router.put("/:id", authenticate, isAdmin, faqController.updateFaq);
router.delete("/:id", authenticate, isAdmin, faqController.deleteFaq);

module.exports = router;
