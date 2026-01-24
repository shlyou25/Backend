const express = require('express');
const router = express.Router();
const subscriptionScontroler=require('./Controllers/subscribe');
const optionalAuth = require('../middlewares/optionalAuth');

router.post('/',optionalAuth,subscriptionScontroler.subscribe)




module.exports=router