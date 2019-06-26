const repo = require('../repository/main.repository')
const _ = require('lodash')
const helper = require('./main.helper')

const error_messages = {
    registered: "Email already registered!",
    server: "Something went wrong in our server. Please try again after a while!",
    required: "Required fields should not be left blank!",
    email: "Not a valid email address",
    password: "Password should be 8 or more characters long",
    contact: "Contact number should only contain numbers and be less than 20 characters long",
    company_exists: "Company name already registered!",
    no_account: "Incorrect email/password",
    no_existing: "Account not registered",
    no_company: "Company not registered",
    bad_date: "Invalid date",
    bad_id: "Invalid ID"
}
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

    database (weekend?)
        - seeker_profile: add education, job history
        - seeker_education:
        - seeker_history:
*/

module.exports = {
    //create account
    createAccount: (req, res, next) => {
        try {
            if(!req.body.email || !req.body.password || !req.body.lastname || !req.body.firstname) {
                throw new Error(error_messages.required)
            }
            else if(!helper.validateEmail(req.body.email)) {
                throw new Error(error_messages.email)
            }
            else if(req.body.password.length < 8) {
                throw new Error(error_messages.password)
            }

            let role = req.query.role || "seeker"
            if(role != "seeker" && role != "employer")  {
                role = "seeker"
            }

            if(role === "seeker") {
                //check if account exists
                repo.getSeekerByEmail(req.body.email).then((results) => {
                    if(results.length === 0) {
                        //create new account
                        return repo.createAccount(role, req.body)
                    }
                    else {
                        //email already registered
                        return Promise.reject(new Error(error_messages.registered))
                    }
                }).then(() => {
                    //successfully registered
                    const msg = "Seeker " + req.body.firstname + " " + req.body.lastname + " created!"
                    res.status(200).send({success: {statusCode: 200, message: msg}})
                }).catch((err) => {
                    console.log(err)
                    if(err.message === error_messages.registered) {
                        res.status(401).send({error: {statusCode: 401, message: err.message, errorCode: 1}})
                    }
                    else {
                        res.status(500).send({error: {statusCode: 500, message: error_messages.server, statusCode: 1}})
                    }
                })
            }

            else if(role === "employer") {
                if(!req.body.company || !req.body.contact) {
                    throw new Error(error_messages.required)
                }
                if(req.body.contact.length > 20 || !helper.validateContact(req.body.contact)) {
                    throw new Error(error_messages.contact)
                }
                repo.getEmployerByEmail(req.body.email).then((results) => {
                    if(results.length === 0) {
                        //check if company exists
                        return repo.getCompanyByName(req.body.company)
                    }
                    else {
                        //email already registered
                        return Promise.reject(new Error(error_messages.registered))
                    }
                }).then((results) => {
                    if(results.length === 0) {
                        //create new account
                        return repo.createAccount(role, req.body)
                    }
                    else {
                        //company already registered
                        return Promise.reject(new Error(error_messages.company_exists))
                    }
                }).then(() => {
                    //successfully registered
                    const msg = "Employer " + req.body.firstname + " " + req.body.lastname + " created!"
                    res.status(200).send({success: {statusCode: 200, message: msg}})
                }).catch((err) => {
                    console.log(err)
                    if(err.message === error_messages.registered || err.message === error_messages.company_exists) {
                        res.status(401).send({error: {statusCode: 401, message: err.message, errorCode: 1}})
                    }
                    else {
                        res.status(500).send({error: {statusCode: 500, message: error_messages.server, statusCode: 1}})
                    }
                })
            }
        }
        catch(err) {
            console.log(err)
            res.status(400).send({error: {statusCode: 400, message: err.message, errorCode: 1}})
        }
    },

    //login account
    loginAccount: (req, res, next) => {
        try {
            if(!helper.validateEmail(req.body.email)) {
                throw new Error(error_messages.email)
            }
            if(req.body.password.length < 8) {
                throw new Error(error_messages.password)
            }
            let role = req.query.role || "seeker"
            if(role != "seeker" && role != "employer") {
                role = "seeker"
            }
            repo.loginAccount(role, req.body).then((data) => {
                console.log(data)
                //check if no matches
                if(data.length === 0) {
                    return Promise.reject(new Error(error_messages.no_account))
                }
                else {
                    const msg = "Welcome, " + role + " " + data[0].first_name + " " + data[0].last_name
                    res.status(200).send({success: {message:msg}})
                    return Promise.resolve()
                }
            }).catch((err) => {
                console.log(err)
                if(err.message === error_messages.no_account) {
                    res.status(401).send({error: {statusCode:401, message: err.message, errorCode: 1}})
                }
                else {
                    res.status(500).send({error: {statusCode:500, message: error_messages.server, errorCode: 1}})
                }
            })
        }
        catch(err) {
            console.log(err)
            res.status(400).send({error: {statusCode:400, message: err.message, errorCode: 1}})
        }
    },

    //delete account
    delAccount: (req, res, next) => {
        try {
            //check if user
            let role = req.query.role || "seeker"
            if(role != "seeker" && role != "employer") {
                role = "seeker"
            }
            //check if jobseeker exists
            if(role === "seeker") {
                repo.getSeekerById(req.params.id).then((data) => {
                    if(data.length === 0) {
                        return Promise.reject(new Error(error_messages.no_delete))
                    }
                    else { //delete account
                        return repo.delAccount(role, req.params.id)
                    }
                }).then(() => {
                    const msg = role + " " + req.params.id + " deleted!"
                    res.send({success: {message: msg}})
                }).catch((e) => {
                    console.log(err)
                    if(err.message = error_messages.no_existing) {
                        res.send({error:{statusCode:401, message:err.message, errorCode: 1}})
                    }
                    res.send({error:{statusCode:500, message:error_messages.server, errorCode: 1}})
                })
            }

            //check if employer exists
            else if(role === "employer") {
                repo.getEmployerById(req.params.id).then((data) => {
                    if(data.length === 0) {
                        return Promise.reject(new Error(error_messages.no_existing))
                    }
                    else { //delete account
                        return repo.delAccount(role, req.params.id)
                    }
                }).then(() => {
                    const msg = role + " " + req.params.id + " deleted!"
                    res.send({success: {message: msg}})
                }).catch((err) => {
                    console.log(err)
                    if(err.message = error_messages.no_existing) {
                        res.send({error:{statusCode:401, message:err.message, errorCode: 1}})
                    }
                    else {
                        res.send({error:{statusCode:500, message:error_messages.server, errorCode: 1}})
                    }
                })
            }
        }
        catch(err) {
            console.log(err)
            res.send({error:{statusCode:500, message:error_messages.server, errorCode: 1}})
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
        repo.getSeekerById(req.params.id).then((data) => {
            res.send(data)
        }).catch((err) => {
            console.log(err)
            res.send({error:{statusCode:500, message:error_messages.server, errorCode: 1}})
        })
    },

    //get employer account
    getEmployer: (req, res, next) => {
        try {
            // if(!req.params.id || typeof(req.params.id) != "number") {
            //     throw new Error(error_messages.bad_id)
            // }
            repo.getEmployerById(req.params.id).then((data) => {
                res.send(data)
            }).catch((e) => {
                console.log(err)
                res.send({error:{statusCode:500, message:error_messages.server, errorCode: 1}})
            })
        }
        catch(err) {
            console.log(err)
            res.send({error:{statusCode:400, message:error_messages.bad_id, errorCode: 1}})
        }
    },

    //create seeker profile
    editSeekerProfile: (req, res, next) => {
        try {
            // if(!req.params.id || typeof(req.params.id) != "number") {
            //     throw new Error(error_messages.bad_id)
            // }
            //check if jobseeker exists
            repo.getSeekerById(req.params.id).then((data) => {
                if(data.length === 0) {
                    return Promise.reject(new Error(error_messages.no_existing))
                }
                else {
                    return repo.editSeekerProfile(req.params.id)
                }
            }).then(() => {
                res.send({success:{message: "Jobseeker Profile Updated!"}})
            }).catch((err) => {
                console.log(err)
                res.send({error: {statusCode:500, message:error_messages.server, errorCode: 1}})
            })
        }
        catch(err) {
            console.log(err)
            res.send({error: {statusCode:500, message:error_messages.server, errorCode: 1}})
        }
    },

    editSeekerTags: (req, res, next) => {
        try {
            // if(!req.params.id || typeof(req.params.id) != "number") {
            //     throw new Error(error_messages.bad_id)
            // }
            repo.getSeekerById(req.params.id).then((data) => {
                if(data.length === 0) {
                    return Promise.reject(new Error(error_messages.no_existing))
                }
                else {
                    return repo.delSeekerTags(req.params.id)
                }
            }).then(() => {
                let tags = JSON.parse(req.body.tags)
                return Promise.all(tags.map((tag) => {
                    repo.addSeekerTags(req.params.id, tag)
                }))
            }).then(() => {
                res.send({success:{message: "Jobseeker Tags Updated!"}})
            }).catch((err) => {
                console.log(err)
                res.send({error:{statusCode:500, message: error_messages.server, errorCode: 1}})
            })
        }
        catch(err) {
            console.log(err)
            if(err.message === error_messages.no_existing) {
                res.send({error:{statusCode:500, message:err.message, errorCode: 1}})
            }
            res.send({error: {statusCode:500, message:error_messages.server, errorCode: 1}})
        }
    },

    //edit company profile (main recruiter only)
    editCompanyProfile: (req, res, next) => {
        try {
            if(!helper.validateInt(req.body.establish)) {
                throw new Error(error_messages.bad_date)
            }
            if(!req.body.company) {
                throw new Error(error_messages.company)
            }
            repo.getEmployerById(req.params.id).then((results) => {
                if(results.length === 0) {
                    return Promise.reject(new Error(error_messages.no_existing))
                }
                else {
                    return repo.getCompanyById(req.params.id)
                }
            }).then((results) => {
                if(results.length === 0) {
                    return Promise.reject(new Error(error_messages.no_company))
                }
                else {
                    return repo.editCompanyProfile(req.params.id, req.body)
                }
            }).then(() => {
                res.status(200).send({success:{statusCode:200, message:"Company Profile Updated!"}})
            }).catch((err) => {
                console.log(err)
                if(err.message === error_messages.no_existing || err.message === error_messages.no_company) {
                    res.status(401).send({error:{statusCode:401, message:err.message, errorCode: 1}})
                }
                else {
                    res.send({error: {statusCode:500, message:error_messages.server, errorCode: 1}})
                }
            })
        }
        catch(err) {
            console.log(err)
            res.status(400).send({error:{statusCode:400, message:err.message, errorCode: 1}})
        }
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
        try {
            if(!req.body.jobname || !req.body.recruiter || !req.body.company || !req.body.deadline) {
                throw new Error(error_messages.required)
            }
            if(!helper.validateInt(req.body.post) || !helper.validateInt(req.body.deadline)) {
                throw new Error(error_messages.bad_date)
            }
            //check if employer
            repo.getEmployerById(req.body.recruiter).then((results) => {
                if(results.length === 0) {
                    return Promise.reject(new Error(error_messages.no_existing))
                }
                else {
                    return repo.createJobPost(req.body)
                }
            }).then(() => {
                res.status(200).send({success: {statusCode:200, message: "Job Post Created!"}})
            }).catch((err) => {
                console.log(err)
                if(err.message === error_messages.no_existing) {
                    res.send({error: {statusCode:401, message:err.message, errorCode: 1}})
                }
                else {
                    res.send({error: {statusCode:500, message:error_messages.server, errorCode: 1}})
                }
            })
        }
        catch(err) {
            console.log(err)
            res.status(400).send({error: {statusCode:400, message:err.message, errorCode: 1}})
        }
    },
    
    // //create job post
    // createJobPost: (req, res, next) => {
    //     if(!req.body.jobname || !req.body.recruiter || !req.body.company) {
    //         res.send("REQUIRED FIELDS NULL")
    //         return Promise.resolve()
    //     }
    //     //check if employer
    //     Promise.all([repo.getEmployer(req.body.recruiter).then((results) => {
    //                     if(results.length === 0) {
    //                         return Promise.reject(new Error("user not registered"))
    //                     }
    //                     else {
    //                         return Promise.resolve()
    //                     }
    //                 }), repo.getCompanyAccount(req.body.company).then((results) => {
    //                     if(results.length === 0) {
    //                         return Promise.reject(new Error("company not registered"))
    //                     }
    //                     else {
    //                         return Promise.resolve()
    //                     }
    //                 })
    //     ]).then(() => {
    //         return repo.createJobPost(req.body)
    //     })
    //     .then(() => {
    //         // res.writeHead(200, '{Content-Type: text/plain}')
    //         res.send("Job Post for " + req.body.jobname + " in " + req.body.company + " has been posted!")
    //     })
    //     .catch((e) => {
    //         console.log(e)
    //         // res.writeHead(404)
    //         res.send("Account not registered")
    //     })
    // },
    
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
        repo.getSeeker(req.params.id).then((data) => {
            if(data.length === 0) {
                res.send("USER NOT IN DATABASE")
                return Promise.reject()
            }
            else {
                return Promise.resolve()
            }
        }).then(() => {
                return repo.getMatchingTags(req.params.id)
        }).then((results) => {
            if(counts.length === 0) {
                res.send("no matching jobs found")
                return Promise.resolve()
            }

            Promise.all(results[0].map((key) => {
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
            }}).then(() => {
                return repo.getApplication(req.body).then((results) => {
                    if(results.length === 0) {
                        return Promise.resolve()
                    }
                    else {
                        res.send("Already applied for job")
                        return Promise.reject()
                    }
                })
            }).then(() =>{
                return repo.verifyJobStatus(req.body.jobId)
            }).then((results) => {
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
        repo.getEmployer(req.body.id).then((results) => {
            if(results.length === 0) {
                res.send("User not registered")
                return Promise.reject(new Error("user not registered"))
            }
            else {
                return Promise.resolve()
            }
        }).then(() => {
            return repo.getApplications(req.body.userId)
        }).then((results) => {
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