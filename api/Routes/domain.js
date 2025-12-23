const express=require('express')
const router=express.Router();
const {authenticate,isAdmin}=require('../middlewares/authenticate');
const domainController=require('./Controllers/domain');

router.post('/adddomain',authenticate,domainController.adddomain);
router.get('/getdomainbyuser',authenticate,domainController.getdomainbyid);
router.get('/getalldomains',authenticate,isAdmin,domainController.getAllDomains)


module.exports=router;