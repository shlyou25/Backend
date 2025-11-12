const express =require('express');
const router = express.Router();
const authController=require('./Controllers/auth')
const middlewaresauth = require('../middlewares/authenticate')

router.post('/register',authController.register);
router.post('/login',authController.login);
router.get('/authenticate',middlewaresauth.authenticate);


module.exports=router;