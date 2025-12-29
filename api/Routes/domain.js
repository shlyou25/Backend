const express=require('express')
const router=express.Router();
const {authenticate,isAdmin}=require('../middlewares/authenticate');
const domainController=require('./Controllers/domain');

router.post('/adddomain',authenticate,domainController.adddomain);
router.get('/getdomainbyuser',authenticate,domainController.getdomainbyuserid);
router.patch('/:id/toggle-hide',authenticate,domainController.toggleHide);
router.patch('/:id/toggle-chat',authenticate,domainController.toggleChat);
router.delete('/:id',authenticate,domainController.deleteDomain);

router.get("/public", domainController.getHiddenDomains);




router.get('/getalldomains',authenticate,isAdmin,domainController.getAllDomains)



module.exports=router;