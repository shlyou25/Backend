const express =require('express');
const router = express.Router();
const authController=require('./Controllers/auth')
const authenticate = require('./Controllers/authenticate')

router.post('/register',authController.register);
router.post('/login',authController.login);
router.get('/logout',authController.logout)
router.get('/authenticate',authenticate.authenticate);


module.exports=router;