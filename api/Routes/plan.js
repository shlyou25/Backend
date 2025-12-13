const express = require('express');
const router = express.Router();
const {authenticate} = require('../middlewares/authenticate');
const planController=require('./Controllers/plan')

router.post('/addplan',authenticate, planController.addPlan);
router.get('/getplanbyuser',authenticate,planController.getplansbyuser);

module.exports=router