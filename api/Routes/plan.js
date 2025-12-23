const express = require('express');
const router = express.Router();
const {authenticate,isAdmin} = require('../middlewares/authenticate');
const planController=require('./Controllers/plan')

router.post('/addplan',authenticate, planController.addPlan);
router.get('/getplanbyuser',authenticate,planController.getplansbyuser);

router.get('/allplans',authenticate,isAdmin,planController.getAllPlans)

module.exports=router