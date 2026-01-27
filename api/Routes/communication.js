const express=require('express');
const router=express.Router();
const communicationController =require('./Controllers/communicationController')

router.post("/send-email", communicationController.sendEmailToSeller);
router.post(
  "/mailgun/inbound",
  express.urlencoded({ extended: false }), // Mailgun sends form-encoded
  communicationController.mailgunInbound
);



module.exports=router;