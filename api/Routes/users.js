const express=require('express');
const router=express.Router();
const userController=require('./Controllers/user');
const {authenticate,isAdmin} = require('../middlewares/authenticate');
const userOverviewController = require('./Controllers/getUserOverview')

router.get('/getuserbyid',authenticate,userController.getuserbyid);
router.put('/updateuserinfo',authenticate,userController.updateuserinfo);

// Admin
router.get("/allusers", authenticate, isAdmin, userController.getallUsers);
router.patch("/updateuserstatus", authenticate, isAdmin, userController.toggleUserStatus);
router.get('/alluseroverview',authenticate,isAdmin,userOverviewController.getUserOverview)

module.exports=router;
