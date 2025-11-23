const express=require('express');
const router=express.Router();
const userController=require('./Controllers/user');
const checkAuth = require('../middlewares/authenticate')

router.get('/getallusers',checkAuth,userController.getallUsers);
router.get('/getuserbyid',checkAuth,userController.getuserbyid);
router.put('/updateuserinfo',checkAuth,userController.updateuserinfo)

module.exports=router;
