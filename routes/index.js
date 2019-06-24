const express = require('express')
const router = express.Router()
const controller = require('../controller/main.controller')

//home page
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

//create account
router.post('/register', controller.createAccount)

//login account
router.post('/login', controller.loginAccount)

// //edit account
// router.put('/account/:id', controller.editAccount)

//delete account
router.delete('/delete/:id', controller.delAccount)

//get all user accounts
router.get('/master', controller.getAllUsers)

//edit jobseeker profile
router.put('/seeker/profile/:id', controller.editSeekerProfile)

//edit jobseeker tags
router.put('seeker/profile/tags/:id', controller.editSeekerTags)

//view job board
router.get('/jobs/all', controller.getJobList)

//view job post
router.get('/jobs/:id', controller.getJobInfo)

//apply for job
router.post('/jobs/:id', controller.applyForJob)

//view pending applications
router.get('/seeker/applications', controller.getApplicationsSeeker)

// //remove applications'
// router.delete('/seeker/applications/:id', controller.delApplication)

//edit company profile
router.put('/company/profile/', controller.editCompanyProfile)

//create job post
router.post('/employer/jobs/new', controller.createJobPost)

//edit job post
router.put('/employer/jobs/:id', controller.editJobPost)

//edit job post tags
router.post('/employer/jobs/:id/tags', controller.editJobTags)

//view own job posts
router.get('/employer/jobs/posts', controller.getJobListEmployer)

//remove job post
router.delete('/employer/jobs/:id', controller.delJobPost)

//view applications in own job posts
router.get('/employer/applications', controller.getApplications)

//view applications in one job post
router.get('/employer/applications/:id', controller.getApplicationsForJob)

//edit application status
router.put('/employer/applications/:id', controller.editApplicationStatus)

//view jobseeker profile
router.get('/employer/applications/applicant/:id', controller.getSeekerProfile)




module.exports = router;
