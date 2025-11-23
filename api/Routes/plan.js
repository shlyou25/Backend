const express = require('express');
const router = express.Router();
const checkAuth = require('../middlewares/authenticate');
const planController=require('./Controllers/plan')

router.post('/addplan',checkAuth, planController.addPlan);
router.get('/getplanbyuser',checkAuth,planController.getplansbyuser);

module.exports=router