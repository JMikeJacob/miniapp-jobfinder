const express = require('express')
const router = express.Router()
const controller = require('../controller/main.controller')


//home page
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

//User CRUD
router.post('/register', controller.createAccount) //create account
router.post('/login', controller.loginAccount) //login account
router.get('/login', controller.checkLogin) //check login
router.put('/account/:id', controller.editAccount) //edit account
router.delete('/account/:id', controller.delAccount) //delete account
router.get('/seeker/:id', controller.getSeeker) //get seeker account
router.get('/employer/:id', controller.getEmployer) //get employer account
router.get('/master', controller.getAllUsers)

//Job Post 
router.get('/jobs/all', controller.getJobList) //get list of all jobs
router.get('/jobs/post/:id', controller.getJobById) //get job post by id ?=tags=true
router.get('/jobs/page/:id/', controller.getJobsPerPage) //get jobs sorted per page
router.get('/employer/jobs/page/:id', controller.getJobsPerPageEmployer) //get jobs sorted per page
router.post('/employer/jobs/new', controller.createJobPost) //create job post
router.put('/employer/jobs/:id', controller.editJobPost) //edit job post
router.delete('/employer/jobs/:id', controller.delJobPost) //delete job post

//Jobseeker Profile
router.get('/seeker/profile/:id', controller.getSeekerProfile) //get seeker profile
router.get('/employer/applications/applicant/:id', controller.getSeekerProfile) //get seeker profile for employer
router.put('/seeker/profile/:id', controller.editSeekerProfile) //edit seeker profile

//Company Profile
router.get('/company/:id', controller.getCompanyProfile) //get company profile
router.put('/company/:id', controller.editCompanyProfile) //edit company profile

//Applications:Seeker
router.post('/jobs/application/:id', controller.applyForJob) //apply for job
router.get('/jobs/application/:job_id/:user_id', controller.getApplicationStatus) //check if applied
router.get('/seeker/applications', controller.getApplicationsSeeker) //view all seeker's applications
router.get('/seeker/:user_id/applications/:page', controller.getApplicationsSeeker) //view seeker's applications sorted per page
router.delete('/jobs/application/:id', controller.delApplication) //delete application

//Applications:Employer
router.get('/employer/:posted_by_id/applications/:page', controller.getApplications) //view applications per page
router.get('/employer/applications/:id', controller.getApplicationsForJob) //view applications for job
router.put('/employer/applications/:id', controller.editApplicationStatus) //change app

//Recommended Jobs
router.get('/seeker/recommended/:id/:page', controller.getRecommendedJobs) //get jobs with matching tags

//Options
router.get('/options', controller.getOptions)

//Utilities
router.get('/redis/master', controller.getAllRedis)
router.get('/redis/:key', controller.getRedisKey)
router.post('/redis/options', controller.postOptions)
router.post('/aws/url', controller.getSignedUrl)
// router.post('/email', controller.emailTest)
// router.post('/image', controller.uploadImage, controller.testVideo)

module.exports = router;
