const express = require("express");
const router = express.Router();
const {authenticate}=require('../middlewares/authenticate');
const controller = require("./Controllers/communicationController");

router.post("/start", authenticate, controller.startConversation);
router.get("/", authenticate, controller.getInbox);
router.get("/:id/messages", authenticate, controller.getMessages);
router.post("/:id/reply", authenticate, controller.replyToConversation);
router.post("/:id/seen", authenticate, controller.markAsSeen);
router.get("/unread-count", authenticate, controller.getUnreadCount);




module.exports = router;
