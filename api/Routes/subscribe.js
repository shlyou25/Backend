const express = require('express');
const router = express.Router();
const subscriptionScontroler=require('./Controllers/subscribe');
const {authenticate,isAdmin} = require('../middlewares/authenticate');
const {optionalAuthenticate} = require('../middlewares/optionalAuth');

router.post('/',optionalAuthenticate,subscriptionScontroler.subscribe)
router.get('/getallsubscriber',authenticate,isAdmin,subscriptionScontroler.getAllSubscribers)




module.exports=router