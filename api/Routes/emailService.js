const express=require('express');
const router=express.Router();
const emailController=require('./Controllers/emailController')

router.post('/sendemail',emailController.sendEmail);

module.exports=router;