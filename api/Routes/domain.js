const express=require('express')
const router=express.Router();
const {authenticate,isAdmin}=require('../middlewares/authenticate');
const domainController=require('./Controllers/domain');

router.post('/adddomain',authenticate,domainController.adddomain);
router.get('/getdomainbyuser',authenticate,domainController.getdomainbyuserid);
router.patch('/:id/toggle-hide',authenticate,domainController.toggleHide);
router.patch('/:id/toggle-chat',authenticate,domainController.toggleChat);

router.get("/public", domainController.getHiddenDomains); 
router.get("/promoted", domainController.getPromotedDomains);


router.get('/getalldomains',authenticate,isAdmin,domainController.getAllDomains);
router.get('/getallpromoteddomain',authenticate,isAdmin,domainController.getAllPromotedDomains);



// DOMAIN PRIORITY & PROMOTION (ADMIN ONLY)

router.put('/:domainId/priority',authenticate,isAdmin,domainController.updateDomainPriority);
router.delete('/promoted/:domainId',authenticate,isAdmin,domainController.removeDomainPriority);
router.post('/promote',authenticate,isAdmin,domainController.promoteDomain);
router.get('/removepromotion/:priority',authenticate,isAdmin,domainController.removeDomainPriority);
router.post('/changedomainstatus',authenticate,isAdmin,domainController.changeDomainStatus);
router.delete('/deletedomain/:domainId',authenticate,isAdmin,domainController.AdmindeleteDomain);


router.delete('/:domainId',authenticate,domainController.deleteDomain);
router.delete('/bulk-delete',authenticate,domainController.deleteBulkDomains);





module.exports=router;