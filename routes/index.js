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

//check if login
router.get('/login', controller.checkLogin)

//edit account
router.put('/account/:id', controller.editAccount)

//get seeker account
router.get('/seeker/:id', controller.getSeeker)

//get employer account
router.get('/employer/:id', controller.getEmployer)

//delete account
router.delete('/delete/:id', controller.delAccount)

//get all user accounts
router.get('/master', controller.getAllUsers)

//get jobseeker profile
router.get('/seeker/profile/:id', controller.getSeekerProfile)

//edit jobseeker profile
router.put('/seeker/profile/:id', controller.editSeekerProfile)

//edit jobseeker tags
// router.put('/seeker/profile/:id/tags', controller.editSeekerTags)

//view job board
router.get('/jobs/all', controller.getJobList)

// view job post
router.get('/jobs/post/:id', controller.getJobById)

//apply for job
router.post('/jobs/application/:id', controller.applyForJob)

//check if applied
router.get('/jobs/application/:job_id/:user_id', controller.getApplicationStatus)

//view pending applications
router.get('/seeker/applications', controller.getApplicationsSeeker)

//remove applications'
router.delete('/jobs/application/:id', controller.delApplication)

//get company profile
router.get('/company/:id', controller.getCompanyProfile)

//edit company profile
router.put('/company/:id', controller.editCompanyProfile)

//create job post
router.post('/employer/jobs/new', controller.createJobPost)

//edit job post
router.put('/employer/jobs/:id', controller.editJobPost)

//edit job post tags
// router.post('/employer/jobs/:id/tags', controller.editJobTags)

//view own job posts
router.get('/employer/jobs/page/:id', controller.getJobsPerPageEmployer)

//remove job post
router.delete('/employer/jobs/:id', controller.delJobPost)

//view own applications
router.get('/seeker/:user_id/applications/:page', controller.getApplicationsSeeker)

//view applications in own job posts
router.get('/employer/:posted_by_id/applications/:page', controller.getApplications)

//view applications in one job post
router.get('/employer/applications/:id', controller.getApplicationsForJob)

//edit application status
router.put('/employer/applications/:id', controller.editApplicationStatus)

//view jobseeker profile
router.get('/employer/applications/applicant/:id', controller.getSeekerProfile)

//get jobs by page
router.get('/jobs/page/:id/', controller.getJobsPerPage)

//get number of job posts
router.get('/jobs/count', controller.getJobCount)

//get number of posted jobs
router.get('/employer/jobs/count', controller.getJobCountEmployer)

//get recommended jobs
router.get('/seeker/recommended/:id/:page', controller.getRecommendedJobs)

//get options
router.get('/options', controller.getOptions)

module.exports = router;
