const express=require('express');
const router=express.Router();
const communicationController =require('./Controllers/communicationController')

router.post("/send-email", communicationController.sendEmailToSeller);


module.exports=router;