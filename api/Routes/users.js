const express=require('express');
const router=express.Router();
const userController=require('./Controllers/user');
const {authenticate,isAdmin} = require('../middlewares/authenticate');

router.get('/getuserbyid',authenticate,userController.getuserbyid);
router.put('/updateuserinfo',authenticate,userController.updateuserinfo);

// Admin
router.get("/allusers", authenticate, isAdmin, userController.getallUsers);

module.exports=router;
