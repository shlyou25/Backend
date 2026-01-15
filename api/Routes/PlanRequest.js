const express = require('express');
const router = express.Router();
const {authenticate,isAdmin} = require('../middlewares/authenticate');
const planRequestController=require('../Routes/Controllers/PlanRequest')

router.post('/addplanrequest',authenticate, planRequestController.planRequest);

//admin
router.get('/getallplanrequest',authenticate,isAdmin,planRequestController.getAllPlanRequests);
router.post('/approveplanrequest',authenticate,isAdmin,planRequestController.approvePlanAdmin)
router.post('/rejectplanrequest',authenticate,isAdmin,planRequestController.rejectPlanRequest);
router.delete('/:id',authenticate,isAdmin,planRequestController.deleterequest)




module.exports=router