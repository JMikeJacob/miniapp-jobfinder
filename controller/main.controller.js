const repo = require('../repository/main.repository')
const _ = require('lodash')

/*
    validations:
        email
            - xxx@yyy.zzz
        password
            - at least 8
        register
            - check if user exists
        edit/del SeekerProfile & Tags
            - must be jobseeker
            - must be original account
        createJobPost
            - must be employer
        edit/del JobPost
            - must be employer
            - must be original poster
        editCompanyProfile
            - must be employer
            - must be orignial account
        applyForJob
            - must be jobseeker
            - did not apply yet

    functions
        VIEW APPLICATIONS (employer)
        filtering - UI?
        sorting - UI?
    additionals
        contact channel between applicant and employer
        create recruiter subuser (main)
        edit recruiter subuser (main)
        delete recruiter subuser (main)
        subuser can:
            view applications
*/

function validateEmail(str) {
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(String(str).toLowerCase())
}

module.exports = {
        
    //create account
    createAccount: (req, res, next) => {
        if(!req.body.email || !req.body.password || !req.body.lastname || !req.body.firstname) {
            res.send("REQUIRED FIELDS NULL")
            return false
        }
        if(!validateEmail(req.body.email)) {
            res.send(req.body.email + " IS NOT A VALID EMAIL ADDRESS")
            return false
        }
        //alphanumeric only
        if(req.body.password.length < 8) {
            res.send("PASSWORD MUST BE AT LEAST 8 CHARACTERS LONG")
            return false
        }
        let role = req.query.role || "candidate"
        if(role != "candidate" && role != "employer") {
            role = "candidate"
        }
        if(role === 'employer') {
            if(!req.body.company || !req.body.contact) {
                res.send("REQUIRED FIELDS NULL")
                return false
            }
        }
        let userFlag = false
        if(role === 'candidate') {
            //check if account exists
            repo.getSeekerAccount(req.body.email).then((results) => {
                if(results.length === 0) {
                    userFlag = true
                }
                else {
                    userFlag = false
                    res.send("Email already registered")
                    return Promise.resolve()
                }
            }).then(() => {
                //create account
                return repo.createAccount(role, req.body)
                .then(() => {
                    if(role === 'candidate') {
                        // res.writeHead(200, '{Content-Type: text/plain}')
                        res.send("User " + req.body.firstname + " " + req.body.lastname + " created!")
                        return Promise.resolve()
                    }
                })
            })
        }
        else if(role === 'employer') {
            //check if email exists
            Promise.all([repo.getEmployerAccount(req.body.email).then((results) => {
                if(results.length === 0) {
                    userFlag = true
                    return Promise.resolve()
                }
                else {
                    userFlag = false
                    res.send("Email already registered")
                    return Promise.reject(new Error("email"))
                }
            }), repo.getCompanyAccount(req.body.company).then((results) => {
                if(results.length === 0) {
                    userFlag = true
                    return Promise.resolve()
                }
                else {
                    userFlag = false
                    console.log(userFlag)
                    res.send("Company already registered")
                    return Promise.reject(new Error("company"))
                }
            })]).then(() => {
                //create employer account
                return repo.createAccount(role, req.body).then(() => {
                    res.send("Employer " + req.body.firstname + " " + req.body.lastname + " created!")
                    return Promise.resolve()
                })
            }).catch((e) => {
                console.log(e.message)
                // res.writeHead(404)
                res.send("Account Creation failed!")
                return false
            })
        }
    },

    // login account
    loginAccount: (req, res, next) => {
        if(!validateEmail(req.body.email)) {
            res.send(req.body.email + "is not a valid email address")
            return false
        }
        if(req.body.password.length < 8) {
            res.send("Password must be at least 8 characters")
            return false
        }
        let role = req.query.role || "candidate"
        if(role != "candidate" && role != "employer") {
            role = "candidate"
        }
        repo.loginAccount(role, req.body)
            .then((data) => {
                //check if no matches
                if(data[0].length === 0) {
                    // res.writeHead(404, '{Content-Type: text/plain}')
                    res.send("Incorrect email and/or password")
                    Promise.resolve()
                }
                else {
                    // res.writeHead(200, '{Content-Type: text/plain}')
                    res.send("Welcome, " + role + " " + data[0][0].first_name)
                    Promise.resolve()
                }
            })
            .catch((e) => {
                console.log(e)
                // res.writeHead(404)
                res.send("Error connecting to database")
            })
    },

    //delete account
    delAccount: (req, res, next) => {
        //check if user
        let role = req.query.role || "candidate"
        let userFlag = false
        if(role != "candidate" && role != "employer") {
            role = "candidate"
        }
        //check if jobseeker exists
        if(role === "candidate") {
            repo.getSeekerAccount(req.params.id, req.body).then((data) => {
                if(data.length === 0) {
                    return Promise.reject(new Error("no user"))
                }
                else {
                    return Promise.resolve()
                }
            }).then(() => {
                return repo.delAccount(role, req.params.id)
            }).then(() => {
                res.send(role + " " + req.params.id + " deleted!")
                return Promise.resolve()
            }).catch((e) => {
                console.log(e.message)
                res.send("User not registered")

                // res.send("Error connecting to database")
            })
        }
        //check if employer exists
        else if(role === "employer") {
            repo.getEmployerAccount(req.params.id, req.body.email).then((data) => {
                if(data.length === 0) {
                    return Promise.reject(new Error("no user"))
                }
                else {
                    userFlag = true
                    return Promise.resolve()
                }
            }).then(() => {
                return repo.delAccount(role, req.params.id)
            }).then(() => {
                res.send(role + " " + req.params.id + " deleted!")
                return Promise.resolve()
            }).catch((e) => {
                console.log(e.message)
                res.send("User not registered")
            })
        }
        
    },

    //get all users
    getAllUsers: (req, res, next) => {
        Promise.all([repo.getAllSeekers(), repo.getAllEmployers()])
               .then((results) => {
                 res.send(results)
                })
               .catch((e) => {
                res.send("Error connecting to database")
                })
    },

    //get seeker account
    getSeeker: (req, res, next) => {
        repo.getSeeker(req.params.id).then((data) => {
            res.send(data)
        }).catch((e) => {
            console.log(e.message)
            res.send("Error connecting to database")
        })
    },

    //get employer account
    getEmployer: (req, res, next) => {
        repo.getEmployer(req.params.id).then((data) => {
            res.send(data)
        }).catch((e) => {
            console.log(e.message)
            res.send("Error connecting to database")
        })
    },

    //create seeker profile
    editSeekerProfile: (req, res, next) => {
        let role = req.query.role || "candidate"
        if(role != "candidate") {
            res.send("must be a jobseeker")
            return Promise.resolve()
        }
        //check if jobseeker exists
        repo.getSeeker(req.params.id).then((data) => {
            if(data[0].length === 0) {
                res.send("User not registered")
                return Promise.resolve()
            }})
        //check if user
        repo.editSeekerProfile(req.params.id, req.body)   
            .then(() => {
                res.send("Jobseeker Profile Created!")
            }).catch((e) => {
                console.log(e.message)
                res.send("User not in database")
            })
    },

    //edit seeker tags
    editSeekerTags: (req, res, next) => {
        let role = req.query.role || "candidate"
        if(role != "candidate") {
            res.send("must be a jobseeker")
            return Promise.resolve()
        }
        //check if user
        //check tags if valid
        //if tags are not in database, add tag to database
        repo.delSeekerTags(req.params.id).then(() => {
            Promise.all(JSON.parse(req.body.tags).map((tag) => {
                repo.addSeekerTags(req.params.id, tag)
            })).then(() => {
                res.send("Jobseeker tags updated!")
            }).catch((e) => {
                console.log(e.message)
                res.send("Error connecting to message")
            })
        }).catch((e) => {
            console.log(e.message)
            res.send("Error connecting to message")
        })
    },

    //edit company profile (main recruiter only)
    editCompanyProfile: (req, res, next) => {
        let role = req.query.role || "employer"
        if(role != "employer") {
            res.send("must be an employer")
            return false
        }
        if(!req.body.company) {
            res.send("REQUIRED FIELDS NULL")
            return false
        }
         //check if employer
         Promise.all([repo.getEmployer(req.body.recruiter).then((results) => {
                        if(results.length === 0) {
                            res.send("user not registered")
                            return Promise.reject(new Error("user not registered"))
                        }
                        else {
                            return Promise.resolve()
                        }
                    }), repo.getCompanyAccount(req.body.basis).then((results) => {
                        if(results.length === 0) {
                            res.send("company not registered")
                            return Promise.reject(new Error("company not registered"))
                        }
                        else {
                            return Promise.resolve()
                        }
                    })
        ]).then(() => {
            return repo.editCompanyProfile(req.params.id, req.body)
        }).then(() => {
            res.send("Profile for " + req.body.company + " updated!")
        }).catch((e) => {
            console.log(e.message)
        })
    },

    //get company profile
    getCompanyProfile: (req, res, next) => {
        repo.getCompanyProfile(req.params.id).then((data) => {
            if(data.length  === 0) {
                res.send("Company not registered")
            }
            else {
                res.send(data)
            }
        }).catch((e) => {
            console.log(e.message)
            res.send("Error connecting to database")
        })
    },

    //get all companies
    getAllCompanies: (req, res, next) => {
        repo.getAllCompanies().then((data) => {
            res.send(data)
        }).catch((e) => {
            console.log(e.message)
            res.send("Error connecting to database")
        })
    },
    
    //create job post
    createJobPost: (req, res, next) => {
        if(!req.body.jobname || !req.body.recruiter || !req.body.company) {
            res.send("REQUIRED FIELDS NULL")
            return Promise.resolve()
        }
        //check if employer
        Promise.all([repo.getEmployer(req.body.recruiter).then((results) => {
                        if(results.length === 0) {
                            return Promise.reject(new Error("user not registered"))
                        }
                        else {
                            return Promise.resolve()
                        }
                    }), repo.getCompanyAccount(req.body.company).then((results) => {
                        if(results.length === 0) {
                            return Promise.reject(new Error("company not registered"))
                        }
                        else {
                            return Promise.resolve()
                        }
                    })
        ]).then(() => {
            return repo.createJobPost(req.body)
        })
        .then(() => {
            // res.writeHead(200, '{Content-Type: text/plain}')
            res.send("Job Post for " + req.body.jobname + " in " + req.body.company + " has been posted!")
        })
        .catch((e) => {
            console.log(e)
            // res.writeHead(404)
            res.send("Account not registered")
        })
    },
    
    //edit job credentials
    editJobTags: (req, res, next) => {
        let tags = JSON.parse(req.body.tags)
        let flag = false
        _.forEach(tags, (tag) => {
            if(!tag.tag || !tag.type) {
                res.send("incomplete fields")
                flag = true
            }
        })
        if(flag) {
            console.log("incomplete fields")
            return false
        }
        Promise.all([
            repo.getEmployer(req.body.recruiter).then((results) => {
                if(results.length === 0) {
                    res.send("User not registered")
                    return Promise.reject(new Error("user not registered"))
                }
                else {
                    return Promise.resolve()
                }
            }),
            repo.getJobByEmployer(req.params.id, req.body.recruiter).then((results) => {
                if(results.length === 0) {
                    res.send("Job not posted")
                    return Promise.reject(new Error("job not posted"))
                }
                else {
                    return Promise.resolve()
                }
            })
        ]).then(() => {
            return repo.delJobTags(req.params.id)
        }).then(() => {
            return Promise.all(JSON.parse(req.body.tags).map((tag) => {
                repo.addJobTags(req.params.id, req.body.recruiter, tag)
            }))
        }).then(() => {
            res.send("Job Post Credentials Updated!")
        }).catch((e) => {
            console.log(e.message)
        })
    },

    //edit job post
    editJobPost: (req, res, next) => {
        if(!req.body.jobname) {
            res.send("REQUIRED FIELDS NULL")
            return Promise.resolve()
        }
        Promise.all([
            repo.getEmployer(req.body.recruiter).then((results) => {
                if(results.length === 0) {
                    res.send("User not registered")
                    return Promise.reject(new Error("user not registered"))
                }
                else {
                    return Promise.resolve()
                }
            }).catch((e) => {
                console.log(e.message)
            }),
            repo.getJobByEmployer(req.params.id, req.body.recruiter).then((results) => {
                if(results.length === 0) {
                    res.send("Job not posted")
                    return Promise.reject(new Error("job not posted"))
                }
                else {
                    return Promise.resolve()
                }
            }).catch((e) => {
                console.log(e.message)
            })
        ]).then(() => {
            return repo.editJobPost(Number(req.params.id), req.body)
        })
        .then(() => {
            // res.writeHead(200, '{Content-Type: text/plain}')
            res.send("Job Post for " + req.body.jobname + " in " + req.body.company + " updated!")
        })
        .catch((e) => {
            console.log(e)
            // res.writeHead(404)
            res.send("Error connecting to database")
        })
    },

    //delete job post
    delJobPost: (req, res, next) => {
        Promise.all([
            repo.getEmployer(req.body.recruiter).then((results) => {
                if(results.length === 0) {
                    res.send("User not registered")
                    return Promise.reject(new Error("user not registered"))
                }
                else {
                    return Promise.resolve()
                }
            }),
            repo.getJobByEmployer(req.params.id, req.body.recruiter).then((results) => {
                if(results.length === 0) {
                    res.send("Job not posted")
                    return Promise.reject(new Error("job not posted"))
                }
                else {
                    return Promise.resolve()
                }
            })
        ]).then(() => {
            return repo.delJobTags(req.params.id)
        }).then(() => {
            return repo.delJobPost(req.params.id)
        }).then(() => {
            // res.writeHead(200, '{Content-Type: text/plain}')
            res.send("Job Post for " + req.body.jobname + " in " + req.body.company + " deleted!")
        }).catch((e) => {
            console.log(e)
            // res.writeHead(404)
        })
    },

    //view jobs you posted
    getJobListEmployer: (req, res, next) => {
        //check if employer
        repo.getEmployer(req.body.id).then((results) => {
            if(results.length === 0) {
                res.send("User not registered")
                return Promise.reject(new Error("user not registered"))
            }
            else {
                return Promise.resolve()
            }
        }).then(() => {
            return repo.getJobListByPoster(req.body.id)
        }).then((data) => {
            if(data.length === 0) {
                res.send("No jobs posted")
                return Promise.reject(new Error("no jobs posted"))
            }
            res.send(data[0])
        }).catch((e) => {
            console.log(e.message)
        })
    },

    //view all jobs
    getJobList: (req, res, next) => {
        repo.getJobList().then((data) => {
            res.send(data[0])
        }).catch((e) => {
            console.log(e.message)
            res.send("Error connecting to database")
        })
    },

    //view job post
    getJobInfo: (req, res, next) => {
        Promise.all([repo.getJobPost(req.params.id),
                    repo.getJobTags(req.params.id)])
                .then((results) => {
                    res.send(results)
                }).catch((e) => {
                    console.log(e.message)
                    res.send("Error connecting to database")
                })
    },

    //recommended jobs
    getRecommendedJobs: (req, res, next) => {
        //check if jobseeker
        repo.getMatchingTags(req.params.id).then((results) => {
            if(counts.length === 0) {
                res.send("no matching jobs found")
                return Promise.resolve()
            }
            let counts = _.sortBy(results[0], 'match_count').reverse()
            let jobs = []

            Promise.all(counts.map((key) => {
                        return repo.getJobsbyId(Number(key.job_id))
                    }))
                    .then((results) => {
                        console.log(results)
                        res.send(results)
                    })
        }).catch((e) => {
            console.log(e.message)
            res.send("Error connecting to database")
        })
    },

    //apply for job
    applyForJob: (req, res, next) => {
        //check if jobseeker
        repo.getSeeker(req.params.id).then((data) => {
            if(data.length === 0) {
                res.send("USER NOT IN DATABASE")
                return Promise.resolve()
            }}).catch((e) => {
                console.log(e.message)
                res.send("Error connecting to database")
            })
        //check if already applied
        repo.verifyJobStatus(req.body.jobId)
            .then((results) => {
                if(results.length === 0) {
                    res.send("JOB POST DOES NOT EXIST")
                    return Promise.resolve()
                }
                if(results.is_open === "yes" || 1) {
                    repo.applyForJob(req.body).then(() => { 
                        res.send("User " + req.body.userId + " applied for " + req.body.jobId)
                    })
                }
                else {
                    res.send("No longer accepting applications")
                    return Promise.resolve()
                }
            })
            .catch((e) => {
                console.log(e.message)
                    res.send("Error connecting to database")
            })
    },

    //view all applications
    getApplications: (req, res, next) => {
        //check if employer
        console.log(req.body.id)
        repo.getApplications(req.body.userId).then((results) => {
            if(results.length === 0) {
                res.send("no applications")
                return Promise.resolve()
            }
            else {
                res.send(results)
            }
        }).catch((e) => {
            console.log(e.message)
            res.send("Error connecting to database")
        })
    },

    //view applications for job ad
    getApplicationsForJob: (req, res, next) => {
        //check if employer
        //check if poster
        repo.getApplicationForJob(req.params.id).then((results) => {
            if(results.length === 0) {
                res.send("no applications for this job")
                return Promise.resolve()
            }
            res.send(results)
        }).catch((e)=> {
            console.log(e)
            res.send("Error connecting to database")
        })
    },

    //view jobseeker applications
    getApplicationsSeeker: (req, res, next) => {
        //check if jobseeker
        repo.getApplicationSeeker(req.params.id).then((results) => {
            if(results.length === 0) {
                res.send("you have not applied for a jobs")
                return Promise.resolve()
            }
        })
        .catch((e)=> {
            console.log(e)
            res.send("Error connecting to database")
        })
    },

    //change application status
    editApplicationStatus: (req, res, next) => {
        if(!req.body.status) {
            res.send("REQUIRED FIELDS NULL")
            return
        }
        repo.editApplicationStatus(req.params.id, req.body).then(() => {
            res.send("Application of " + req.body.userId + " for Job " + req.params.id + " updated!")
        }).catch((e) => {
            console.log(e.message)
            res.send("Error connecting to database")
        })
    },

    //view jobseeker profile (lastname, firstname, email, profile, tags)
    getSeekerProfile: (req, res, next) => {
        //check if employer
        let role = req.query.role || "candidate"
        if(req.query.role != "candidate" || req.query.role != "employer") {
            res.send("role not recognized")
            return
        }
        Promise.all([repo.getSeekerProfile(req.params.id),
                     repo.getSeekerTags(req.params,id)])
                .then((results) => {
                    res.send(results)
                })
                .catch((e) => {
                    console.log(e.message)
                    res.send("Error connecting to database")
                })
    }
}