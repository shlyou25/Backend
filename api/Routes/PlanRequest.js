const express = require('express');
const router = express.Router();
const {authenticate,isAdmin} = require('../middlewares/authenticate');
const planRequestController=require('../Routes/Controllers/PlanRequest')

router.post('/addplanrequest',authenticate, planRequestController.planRequest);

//admin
router.post('/getallplanrequest',authenticate,isAdmin,planRequestController.getAllPlanRequests)




module.exports=router