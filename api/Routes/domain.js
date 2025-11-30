const express=require('express')
const router=express.Router();
const checkAuth=require('../middlewares/authenticate');
const domainController=require('./Controllers/domain');

router.post('/adddomain',checkAuth,domainController.adddomain);
router.get('/getdomainbyuser',checkAuth,domainController.getdomainbyid);


module.exports=router;