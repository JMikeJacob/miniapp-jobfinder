const repo = require('../repository/main.repository')
const _ = require('lodash')
const session = require('express-session')
const helper = require('./main.helper')

//AWS S3
const AWS = require('aws-sdk')
const s3 = new AWS.S3()

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
    no_job: "Job not posted",
    bad_date: "Invalid date",
    bad_id: "Invalid ID",
    bad_page: "Invalid page number",
    no_match: "No matching jobs found",
    applied: "Already applied for job",
    not_accepting: "No longer accepting applications for that job",
    bad_format: "Invalid file format"
}

const orders = ['date_posted', 'job_name', 'company', 'salary']
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
                    if(!results) {
                        //create new account
                        return repo.createAccountSeeker(req.body)
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
                        res.status(400).send({error: {statusCode: 401, message: err.message, errorCode: 1001}})
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
                    if(!results) {
                        //check if company exists
                        return repo.getCompanyByName(req.body.company)
                    }
                    else {
                        //email already registered
                        return Promise.reject(new Error(error_messages.registered))
                    }
                }).then((results) => {
                    if(!results) {
                        //create new account
                        return repo.createAccountEmployer(req.body)
                    }
                    else {
                        //company already registered
                        return Promise.reject(new Error(error_messages.company_exists))
                    }
                }).then((results) => {
                    //successfully registered
                    const msg = "Employer " + req.body.firstname + " " + req.body.lastname + " created!"
                    res.status(200).send({success: {statusCode: 200, message: msg, data: results}})
                }).catch((err) => {
                    console.log(err)
                    if(err.message === error_messages.registered || err.message === error_messages.company_exists) {
                        res.status(400).send({error: {statusCode: 400, message: err.message, errorCode: 1002}})
                    }
                    else {
                        res.status(500).send({error: {statusCode: 500, message: error_messages.server, statusCode: 1}})
                    }
                })
            }
        }
        catch(err) {
            console.log(err)
            res.status(400).send({error: {statusCode: 400, message: err.message, errorCode: 1000}})
        }
    },

    getSeekerRedis: (req, res, next) => {
        repo.getSeekerRedis(req.params.id).then((data) => {
            delete data.password
            res.status(200).send(data)
        })
    },

    //login account
    loginAccount: (req, res, next) => {
        try {
            // console.log(req.session.id)
            // if(req.session.user) {
            //     throw new Error("Currently logged in")
            // }
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
            if(role==="seeker") {
                repo.loginAccountSeekerRedis(req.body.email).then((data) => {
                    if(data) { //in redis
                        if(req.body.email === data.email && req.body.password === data.password) {
                            console.log("in redis")
                            delete data.password
                            res.status(200).send({user:data})
                            return Promise.resolve()
                        }
                    }
                    console.log("not in redis")
                    return Promise.reject(new Error(error_messages.no_account))
                    // return repo.loginAccountSeeker(req.body)
                // }).then((data) => {
                //     console.log(data)
                //     //check if no matches
                //     if(data.length === 0) {
                //         return Promise.reject(new Error(error_messages.no_account))
                //     }
                //     else {
                //         // const msg = "Welcome, " + role + " " + data[0].first_name + " " + data[0].last_name
                //         delete data[0].password
                //         // req.session.user = data[0]
                //         // req.session.save()
                //         res.status(200).send({user: data[0]})
                //         return Promise.resolve()
                //     }
                }).catch((err) => {
                    console.log(err)
                    if(err.message === error_messages.no_account) {
                        res.status(400).send({error: {statusCode:400, message: err.message, errorCode: 1}})
                    }
                    else {
                        res.status(500).send({error: {statusCode:500, message: error_messages.server, errorCode: 1}})
                    }
                })
                
            }
            else if(role === "employer") {
                repo.loginAccountEmployerRedis(req.body.email).then((data) => {
                    console.log(data)
                    if(data) { //in redis
                        if(req.body.email === data.email && req.body.password === data.password) {
                            console.log("in redis")
                            delete data.password
                            res.status(200).send({user:data})
                            return Promise.resolve()
                        }
                    }
                    console.log("not in redis")
                    return Promise.reject(new Error(error_messages.no_account))
                    // return repo.loginAccountEmployer(req.body)
                // }).then((data) => {
                //     //check if no matches
                //     if(data.length === 0) {
                //         return Promise.reject(new Error(error_messages.no_account))
                //     }
                //     else {
                //         // const msg = "Welcome, " + role + " " + data[0].first_name + " " + data[0].last_name
                //         delete data[0].password
                //         // req.session.user = data[0]
                //         // req.session.save()
                //         res.status(200).send({user: data[0]})
                //         return Promise.resolve()
                //     }
                }).catch((err) => {
                    console.log(err)
                    if(err.message === error_messages.no_account) {
                        res.status(400).send({error: {statusCode:400, message: err.message, errorCode: 1}})
                    }
                    else {
                        res.status(500).send({error: {statusCode:500, message: error_messages.server, errorCode: 1}})
                    }
                })
            }
            
        }
        catch(err) {
            console.log(err)
            res.status(400).send({error: {statusCode:400, message: err.message, errorCode: 1}})
        }
    },

    editAccount: (req, res, next) => {
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
            if(role === "seeker") { 
                repo.getSeekerByEmail(req.body.email).then((data) => {
                    if(data) {
                        return repo.editAccountSeeker(req.params.id, req.body)
                    }
                    else {
                        if(data === req.params.id) {
                            return repo.editAccountSeeker(req.params.id, req.body)
                        }
                        //email already registered
                        return Promise.reject(new Error(error_messages.registered))
                    }
                }).then(() => {
                    res.status(200).send({success: {message: "Account edit successful!"}})
                }).catch((err) => {
                    console.error(err)
                    if(err.message === error_messages.registered) {
                        res.status(403).send({error: {statusCode: 403, message: error_messages.registered, errorCode: 1103}})
                    }
                    else {
                        res.status(500).send({error: {statusCode: 500, message: error_messages.server, errorCode: 5000}})
                    }
                })
            }
            else if(role === "employer") { 
                repo.getEmployerByEmail(req.body.email).then((results) => {
                    if(!results) {
                        //create new account
                        return repo.editAccountEmployer(req.params.id, req.body)
                    }
                    else {
                        if(results === req.params.id) {
                            return repo.editAccountEmployer(req.params.id, req.body)
                        }
                        //company already registered
                        return Promise.reject(new Error(error_messages.registered))
                    }
                }).then(() => {
                    res.status(200).send({success: {message: "Account edit successful!"}})
                }).catch((err) => {
                    console.error(err)
                    res.status(500).send({error: {statusCode: 500, message: error_messages.server, errorCode: 5000}})
                })
            }
        }
        catch(err) {
            console.log(err)
            res.status(400).send({error: {statusCode: 400, message: err.message, errorCode: 1000}})
        }
    },

    checkLogin: (req, res, next) => {
        try {
            req.session.user ? res.status(200).send({loggedIn:true}) : res.status(200).send({loggedIn: false})
        }
        catch(err) {
            console.error(err)
            res.status(500).send({statusCode: 500, message:error_messages.server, errorCode: 5000})
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
                console.log(req.params.id)
                repo.getSeekerById(req.params.id).then((data) => {
                    if(data.length === 0) {
                        console.log("AAAA")
                        return Promise.reject(new Error(error_messages.no_delete))
                    }
                    else { //delete account
                        return repo.delAccountSeeker(req.params.id)
                    }
                }).then(() => {
                    const msg = role + " " + req.params.id + " deleted!"
                    res.send({success: {statusCode: 200, message: msg}})
                }).catch((err) => {
                    console.log(err)
                    if(err.message = error_messages.no_existing) {
                        res.status(401).send({error:{statusCode:401, message:err.message, errorCode: 1}})
                    }
                    else {
                        res.status(500).send({error:{statusCode:500, message:error_messages.server, errorCode: 1}})
                    }
                })
            }

            //check if employer exists
            else if(role === "employer") {
                repo.getEmployerById(req.params.id).then((data) => {
                    if(data.length === 0) {
                        return Promise.reject(new Error(error_messages.no_existing))
                    }
                    else { //delete account
                        return repo.delAccountEmployer(req.params.id)
                    }
                }).then(() => {
                    const msg = role + " " + req.params.id + " deleted!"
                    res.send({success: {statusCode: 200, message: msg}})
                }).catch((err) => {
                    console.log(err)
                    if(err.message = error_messages.no_existing) {
                        res.status(401).send({error:{statusCode:401, message:err.message, errorCode: 1}})
                    }
                    else {
                        res.status(500).send({error:{statusCode:500, message:error_messages.server, errorCode: 1}})
                    }
                })
            }
        }
        catch(err) {
            console.log(err)
            res.status(500).send({error:{statusCode:500, message:error_messages.server, errorCode: 1}})
        }
    },

    //get all users
    getAllUsers: (req, res, next) => {
        try {
            // if(!req.params.id || typeof(req.params.id) != "number") {
            //     throw new Error(error_messages.bad_id)
            // }
            Promise.all([repo.getAllSeekers(), repo.getAllEmployers()]).then((data) => {
                res.status(200).send({success: {statusCode: 200, data: data}})
            }).catch((err) => {
                console.log(err)
                res.status(500).send({error:{statusCode:500, message:error_messages.server, errorCode: 1}})
            })
        }
        catch(err) {
            console.log(err)
            res.status(400).send({error:{statusCode:400, message:error_messages.bad_id, errorCode: 1}})
        }
    },

    //get seeker account
    getSeeker: (req, res, next) => {
        try {
            // if(!req.params.id || typeof(req.params.id) != "number") {
            //     throw new Error(error_messages.bad_id)
            // }
            repo.getSeekerByIdRedis(req.params.id).then((data) => {
                if(data) { //in redis
                    if(req.params.id === data.user_id) {
                        console.log("in redis")
                        return Promise.resolve([data])
                    }
                    else {
                        console.log("not in redis")
                        return repo.getSeekerById(req.params.id)
                    }
                }
            }).then((data) => {
                if(data.length === 0) {
                //1104 no account seeker
                    return Promise.reject(new Error(1104))
                }
                else {
                    res.status(200).send({data: data[0]})
                }
            }).catch((err) => {
                console.log(err)
                if(err.message === 1004) {
                    res.status(404).send({error:{statusCode:404, message:error_messages.no_existing, errorCode: 1104}})
                }
                else {
                    res.status(500).send({error:{statusCode:500, message:error_messages.server, errorCode: 5000}})
                }
            })
        }
        catch(err) {
            console.log(err)
            res.status(400).send({error:{statusCode:400, message:error_messages.bad_id, errorCode: 1}})
        }
    },

    //get seeker account
    getSeekerByEmail: (req, res, next) => {
        repo.getSeekerByEmail(req.body.email).then((data) => {
            if(data.length === 0) {
            //1104 no account employer
                return Promise.reject(new Error(1104))
            }
            else {
                delete data.password
                res.status(200).send({data: data})
            }
        }).catch((err) => {
            console.log(err)
            if(err.message === 1004) {
                res.status(404).send({error:{statusCode:404, message:error_messages.no_existing, errorCode: 1104}})
            }
            else {
                res.status(500).send({error:{statusCode:500, message:error_messages.server, errorCode: 5000}})
            }
        })
    },

    //get employer account
    getEmployer: (req, res, next) => {
        try {
            // let id = 0
            // if(!req.session.user || req.session.user.role != "employer") {
            //     throw new Error("not logged in")
            // }
            // else {
            //     id = req.session.user.user_id
            // }
            const id = req.params.id
            // if(!req.params.id || typeof(req.params.id) != "number") {
            //     throw new Error(error_messages.bad_id)
            // 
            repo.getEmployerByIdRedis(req.params.id).then((data) => {
                if(data) { //in redis
                    if(req.params.id === data.user_id) {
                        console.log("in redis")
                        return Promise.resolve([data])
                    }
                    else {
                        console.log("not in redis")
                        return repo.getEmployerById(req.params.id)
                    }
                }
            }).then((data) => {
                if(data.length === 0) {
                //1104 no account employer
                    return Promise.reject(new Error(1104))
                }
                else {
                    res.status(200).send({data: data[0]})
                }
            }).catch((err) => {
                console.log(err)
                if(err.message === 1004) {
                    res.status(404).send({error:{statusCode:404, message:error_messages.no_existing, errorCode: 1104}})
                }
                else {
                    res.status(500).send({error:{statusCode:500, message:error_messages.server, errorCode: 5000}})
                }
            })
        }
        catch(err) {
            console.log(err)
            res.status(403).send({error:{statusCode:403, message:error_messages.bad_id, errorCode: 1}})
        }
    },

    //create seeker profile
    editSeekerProfile: (req, res, next) => {
        try {
            // if(!req.params.id || typeof(req.params.id) != "number") {
            //     throw new Error(error_messages.bad_id)
            // }
            //check if jobseeker exists
            console.log(req.body)
            let urlPic = ""
            let urlResume = ""
            repo.getSeekerById(req.params.id).then((data) => {
                if(data.length === 0) {
                    return Promise.reject(new Error(error_messages.no_existing))
                }
                else {
                    return repo.editSeekerProfile(req.params.id, req.body)
                }
            }).then(() => {
                if(req.body.pic_url && req.body.pic_url !=="") {
                    // const ext = req.body.pic_url.split('.')[req.body.pic_url.split('.').length-1]
                    // if(!helper.options.image_exts.includes(ext)) {
                    //     return Promise.reject(error_messaes.bad_format)
                    // }
                    // urlPic = s3.getSignedUrl('putObject', {
                    //     Bucket: "jobseeker-file-bucket", 
                    //     Key: req.body.pic_url, 
                    //     Expires: 60 * 2, 
                    //     ACL: "bucket-owner-full-control",
                    //     ContentType: "image/"+req.body.pic_url.split('.')[req.body.pic_url.split('.').length-1]
                    // })
                    // return repo.addSeekerPic(req.params.id, urlPic.split('?')[0])
                    return repo.addSeekerPic(req.params.id, req.body.pic_url)
                }
                else {
                    return Promise.resolve()
                }
            }).then(() => {
                if(req.body.resume_url && req.body.resume_url !=="") {
                    // let contenttype = ""
                    // const ext = req.body.resume_url.split('.')[req.body.resume_url.split('.').length-1]
                    // if(ext === "docx" || ext === "doc") {
                    //     contenttype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    // }
                    // else if(ext === "pdf") {
                    //     contenttype = "application/pdf"
                    // }
                    // else {
                    //     return Promise.reject(error_messages.bad_format)
                    // }
                    // urlResume = s3.getSignedUrl('putObject', {
                    //     Bucket: "jobseeker-file-bucket", 
                    //     Key: req.body.resume_url, 
                    //     Expires: 60 * 2, 
                    //     ACL: "bucket-owner-full-control",
                    //     ContentType: contenttype
                    // })
                    // return repo.addSeekerResume(req.params.id, urlResume.split('?')[0])
                    return repo.addSeekerResume(req.params.id, req.body.resume_url)
                }
                else {
                    return Promise.resolve()
                }
            }).then(() => {
                return repo.delSeekerTags(req.params.id)
            }).then(() => {
                const tags = req.body.tags
                const tags_str = helper.stringifyTags(tags)
                return repo.addSeekerTags(req.params.id, tags, tags_str)
            }).then(() => {
                res.status(200).send({success:{statusCode:200, url: urlPic, urlResume: urlResume}})
            }).catch((err) => {
                console.log(err)
                if(err.message === error_messages.bad_format) {
                    //4110: BAD FILE FORMAT
                    res.status(400).send({error:{statusCode:400, message:err.message, errorCode: 4110}})
                }
                else {
                    res.status(500).send({error: {statusCode:500, message:error_messages.server, errorCode: 1}})
                }
            })
        }
        catch(err) {
            console.log(err)
            res.status(500).send({error: {statusCode:500, message:error_messages.server, errorCode: 1}})
        }
    },

    //edit company profile (main recruiter only)
    editCompanyProfile: (req, res, next) => {
        try {
            let url = ""
            if(req.body.establishment_date && !helper.validateInt(req.body.establishment_date)) {
                throw new Error(error_messages.bad_date)
            }
            if(!req.body.name) {
                throw new Error(error_messages.company)
            }
            repo.getEmployerByIdRedis(req.params.id).then((results) => {
                if(!results) {
                    return Promise.reject(new Error(error_messages.no_existing))
                }
                else {
                    return repo.editCompanyProfile(req.params.id, req.body)
                }
            }).then(() => {
                console.log(req.body)
                if(req.body.pic_url && req.body.pic_url !=="") {
                    // const ext = req.body.pic_url.split('.')[req.body.pic_url.split('.').length-1]
                    // if(!helper.options.image_exts.includes(ext)) {
                    //     return Promise.reject(new Error(error_messages.bad_format))
                    // }
                    // url = s3.getSignedUrl('putObject', {
                    //     Bucket: "jobseeker-file-bucket", 
                    //     Key: req.body.pic_url, 
                    //     Expires: 60 * 2, 
                    //     ACL: "bucket-owner-full-control",
                    //     ContentType: "image/"+req.body.pic_url.split('.')[req.body.pic_url.split('.').length-1]
                    // })
                    // return repo.addCompanyPic(req.params.id, url.split('?')[0])
                    return repo.addCompanyPic(req.params.id, req.body.pic_url)
                }
                else {
                    return Promise.resolve()
                }
            }).then(() => {
                res.status(200).send({success:{statusCode:200, url: url}})
            }).catch((err) => {
                console.log(err)
                if(err.message === error_messages.no_existing || err.message === error_messages.no_company) {
                    res.status(404).send({error:{statusCode:404, message:err.message, errorCode: 1104}})
                }
                else if(err.message === error_messages.bad_format) {
                    //4110: BAD IMAGE FORMAT
                    res.status(400).send({error:{statusCode:400, message:err.message, errorCode: 4110}})
                }
                else {
                    res.status(500).send({error: {statusCode:500, message:error_messages.server, errorCode: 5000}})
                }
            })
        }
        catch(err) {
            console.log(err)
            res.status(400).send({error:{statusCode:400, message:err.message, errorCode: 4000}})
        }
    },

    //get company profile
    getCompanyProfile: (req, res, next) => {
        try {
            // if(!req.params.id || typeof(req.params.id) != "number") {
            //     throw new Error(error_messages.bad_id)
            // }
            repo.getCompanybyIdRedis(req.params.id).then((data) => {
                if(data) {
                    if(req.params.id === data.company_id) {
                        console.log("in redis")
                        res.status(200).send({success: {statusCode:200, data: data}})
                        return Promise.resolve()
                    }
                }
                console.log("not in redis")
                return Promise.reject(new Error(error_message.no_company))
            }).catch((err) => {
                console.log(err)
                if(err.message = error_messages.no_company) {
                    res.status(404).send({error: {statusCode: 404, message:error_messages.no_company, errorCode: 1104}})
                }
                else {
                    res.status(500).send({error:{statusCode:500, message:error_messages.server, errorCode: 5000}})
                }
            })
        }
        catch(err) {
            console.log(err)
            res.status(400).send({error:{statusCode:400, message:error_messages.bad_id, errorCode: 4000}})
        }
    },

    //get all companies
    getAllCompanies: (req, res, next) => {
        try {
            // if(!req.params.id || typeof(req.params.id) != "number") {
            //     throw new Error(error_messages.bad_id)
            // }
            repo.getAllCompanies().then((data) => {
                if(data.length === 0) {
                    res.status(404).send({error: {statusCode: 404, message:error_messages.no_company, errorCode: 1104}})
                }
                else {
                    res.status(200).send({success: {statusCode:200, data: data}})
                }
            }).catch((err) => {
                console.log(err)
                res.status(500).send({error:{statusCode:500, message:error_messages.server, errorCode: 5000}})
            })
        }
        catch(err) {
            console.log(err)
            res.status(500).send({error:{statusCode:400, message:error_messages.bad_id, errorCode: 5000}})
        }
    },

    //create job post
    createJobPost: (req, res, next) => {
        let id = 0
        try {
            // if(!req.session.user || req.session.user.role != "employer") {
            //     throw new Error("not logged in")
            // }
            // else {
            //     id = req.session.user.user_id
            // }
            const id = req.body.posted_by_id

            if(!req.body.job_name || !req.body.company_name || !req.body.date_deadline) {
                throw new Error(error_messages.required)
            }
            if(!helper.validateInt(req.body.date_posted) || !helper.validateInt(req.body.date_deadline)) {
                throw new Error(error_messages.bad_date)
            }
            //check if employer
            repo.getEmployerById(id).then((results) => {
                if(results.length === 0) {
                    return Promise.reject(new Error(error_messages.no_existing))
                }
                else {
                    return repo.createJobPost(id, req.body)
                }
            }).then((data) => {
                const tags = req.body.tags
                const tags_str = helper.stringifyTags(tags)
                return repo.addJobTags(data, req.body.posted_by_id, tags, tags_str)
            }).then(() => {
                res.status(200).send({success: {statusCode:200, message: "Job Post Created!"}})
            }).catch((err) => {
                console.log(err)
                if(err.message === error_messages.no_existing) {
                    res.status(404).send({error: {statusCode:404, message:err.message, errorCode: 1104}})
                }
                else {
                    res.status(500).send({error: {statusCode:500, message:error_messages.server, errorCode: 5000}})
                }
            })
        }
        catch(err) {
            console.log(err)
            res.status(400).send({error: {statusCode:400, message:err.message, errorCode: 4000}})
        }
    },

    //edit job post
    editJobPost: (req, res, next) => {
        try {
            // let id = 0
            // if(!req.session.user || req.session.user.role != "employer") {
            //     throw new Error("not logged in")
            // }
            // else {
            //     id = req.session.user.user_id
            // }
            // const id = req.query.posted_by_id
            if(!req.body.job_name || !req.body.date_deadline) {
                throw new Error(error_messages.required)
            }
            if(!helper.validateInt(req.body.date_deadline)) {
                throw new Error(error_messages.bad_date)
            }
            //check if employer
            repo.editJobPost(req.params.id, req.body).then(() => {
                return repo.delJobTags(req.params.id)
            }).then(() => {
                const tags = req.body.tags
                const tags_str = helper.stringifyTags(req.body.tags)
                console.log(tags)
                repo.addJobTags(req.params.id, req.body.posted_by_id, tags, tags_str)
            }).then(() => {
                res.status(200).send({message: "Job Post Updated!"})
            }).catch((err) => {
                console.log(err)
                if(err.message === error_messages.no_existing) {
                    res.status(404).send({error: {statusCode:404, message:err.message, errorCode: 1204}})
                }
                else {
                    res.status(500).send({error: {statusCode:500, message:error_messages.server, errorCode: 5000}})
                }
            })
        }
        catch(err) {
            console.log(err)
            res.status(400).send({error: {statusCode:400, data: req.body, message:err.message, errorCode: 4000}})
        }
    },

    //delete job post
    delJobPost: (req, res, next) => {
        try {
            // repo.getEmployerById(req.body.posted_by_id).then((results) => {
            //     if(results.length === 0) {
            //         return Promise.reject(new Error(error_messages.no_existing))
            //     }
            //     else {
            //         return 
            //     }
            // })
            repo.delJobPost(req.params.id).then(() => {
                return repo.delJobTags(req.params.id)
            }).then(() => {
                return repo.delApplications(req.params.id)
            }).then(() => {
                res.status(200).send({success: {statusCode:200, message:"Job Post deleted!"}})
            }).catch((err) => {
                console.error(err)
                if(err.message === error_messages.no_existing) {
                    res.status(404).send({error:{statusCode:404, message: error_messages.no_existing, errorCode: 1204}})
                }
                else {
                    res.status(500).send({error:{statusCode:500, message: error_messages.server, errorCode: 5000}})
                }
            })
        }
        catch(err) {
            console.error(err)
            res.status(500).send({error:{statusCode:500, message: error_messages.server, errorCode: 500}})
        }
    },

    //view all jobs
    getJobList: (req, res, next) => {
        repo.getJobList().then((data) => {
            if(data.length === 0) {
                res.status(200).send({data: {count: 0}})
            }
            else {
                
                res.status(200).send({data: data})
            }
        }).catch((err) => {
            console.log(err)
            res.status(500).send({error:{statusCode: 500, message: error_messages.server, errorCode: 1}})
        })
    },

    //view job post
    getJobById: (req, res, next) => {
        let payload = {}
        repo.getJobByIdRedis(req.params.id).then((data) => {
            if(data) {
                console.log(data)
                if(req.params.id === data.job_id) {
                    console.log("in redis")
                    return Promise.resolve([data])
                }
            }
            console.log("not in redis")
            return repo.getJobById(req.params.id)})
        .then((data) => {
            if(data.length === 0) {
                res.status(404).send({error: {statusCode: 404, message: "job not posted", errorCode: 1}})
                return Promise.resolve("nojob")
            }
            else {
                payload = data[0]
                return repo.getJobTags(req.params.id)
            }
        }).then((data) => {
            if(data !== "nojob") {
                console.log(data)
                payload.tags = JSON.parse(data)
                console.log(payload)
                res.status(200).send({data: payload})
            } 
        }).catch((err) => {
            console.log(err)
            res.send({error:{statusCode: 500, message: error_messages.server, errorCode: 1}})
        })
    },

    //recommended jobs
    getRecommendedJobs: (req, res, next) => {
        const order = orders.includes(req.query.order) ? req.query.order : 'date_posted'
        const how = req.query.how==='asc' ? 'asc' : 'desc'
        if(req.params.id < 0) {
            //error 4000 = bad request
            throw Error(4000)
        }
        if(req.params.id === 0) req.params.id = 1
        const limit = req.query.limit || 20
        const start = limit * (req.params.page - 1) || 0
        let counts = []
        let total = 0
        repo.getSeekerById(req.params.id).then((data) => {
            if(data.length === 0) {
                return Promise.reject(new Error(error_messages.no_match))
            }
            else {
                return Promise.resolve()
            }
        }).then(() => {
                return repo.getMatchingTags(req.params.id, start, limit)
        }).then((results) => {
            console.log(results)
            total = results[0].length
            for(let i = 0; i < results[0].length; i++) {
                counts.push(results[0][i].match_count)
            }
            if(results.length === 0) {
                return Promise.reject(new Error(error_messages.no_match))
            }

            Promise.all(results[0].map((key) => {
                        return repo.getJobById(Number(key.job_id))
                    }))
                    .then((results) => {
                        console.log(results)
                        const jobs = []
                        for(let i = 0; i < results.length; i++){
                            results[i][0].count = counts[i]
                            jobs.push(results[i][0])
                        }
                        res.status(200).send({data:{count: total, jobs: jobs}})
                    })
        }).catch((err) => {
            console.log(err)
            if(err.message === error_messages.no_match) {
                //1205 - no matching jobs
                res.status(404).send({error: {statusCode: 404, message: error_messages.no_match, errorCode: 1205}})
            }
            else {
                res.status(500).send({error:{statusCode: 500, message: error_messages.server, errorCode: 5000}})
            }
        })
    },

    //apply for job
    applyForJob: (req, res, next) => {
        //check if jobseeker
        let app_id = 0
        repo.getSeekerById(req.body.user_id).then((data) => {
            if(data.length === 0) {
                return Promise.reject(new Error(error_messages.no_existing))
            }}).then(() => {
                return repo.getApplication(req.body).then((results) => {
                    if(results.length === 0) {
                        return Promise.resolve()
                    }
                    else {
                        return Promise.reject(new Error(error_messages.applied))
                    }
                })
            }).then(() =>{
                return repo.verifyJobStatus(req.body.job_id)
            }).then((results) => {
                if(results.length === 0) {
                    return Promise.resolve(new Error(error_messages.no_job))
                }
                if(results.is_open === "yes" || 1) {
                    return repo.applyForJob(req.body)
                }
                else {
                    return Promise.reject(new Error(error_messages.not_accepting))
                }
            }).then((results) => {
                const msg = "User " + req.body.userId + " applied for " + req.body.jobId
                app_id = results[0].insertId
                // console.log(app_id)
                return repo.getSocketId(req.body.posted_by_id)
            }).then((res) => {
                console.log(app_id)
                if(!res) {
                    return repo.incrementNotifCount(req.body.posted_by_id)
                }
                else {
                    console.log(app_id)
                    return Promise.resolve()
                }
            }).then(() => {
                return repo.getEmailValues(req.body.user_id, req.body.posted_by_id, req.body.job_id)
            }).then((results) => {
                console.log(results)
                const emailValuesSeeker = {
                    company_name: results[1][1].company_name,
                    first_name: results[0][1].first_name,
                    last_name: results[0][1].last_name,
                    job_name: results[2][1].job_name,
                    date_posted: new Date(req.body.date_posted),
                    to_address: results[0][1].email,
                    employer_name: results[1][1].first_name + " " + results[1][1].last_name,
                    employer_email: results[1][1].email,
                    contact_no: results[1][1].contact_no
                }
                const emailValues = {
                    company_name: results[1][1].company_name,
                    first_name: results[0][1].first_name,
                    last_name: results[0][1].last_name,
                    job_name: results[2][1].job_name,
                    date_posted: new Date(req.body.date_posted),
                    to_address: results[1][1].email,
                    employer_name: results[1][1].first_name + " " + results[1][1].last_name
                }
                console.log(emailValues)
                helper.sendAppAlertToEmployer(emailValues)
                helper.sendAppAlertToSeeker(emailValuesSeeker)
                res.status(200).send({app_id: app_id})
            })
            .catch((err) => {
                console.log(err)
                if(err.message === error_messages.no_job) {
                    res.send({error: {statusCode: 403}})
                }
                else {
                    res.status(500).send({error: {statusCode: 500, message: error_messages.server, errorCode: 5000}})
                }
            })
    },

    delApplication: (req, res, next) => {
        repo.getApplicationStatusById(req.params.id).then((results) => {
            console.log(results)
            if(results[0].status==="pending") {
                return repo.delApplication(req.params.id)
            }
            else {
                res.status(403).send({error: {statusCode: 403, message: "cannot withdraw processed application", errorCode: 4003}})
                return Promise.resolve("skip")
            }
        }).then((results) => {
            if(results !== "skip") {
                res.status(200).send({data: "Delete Success!"})
            }
        }).catch((err) => {
            console.error(err)
            res.status(500).send({error: {statusCode: 500, message: error_messages.server, errorCode: 5000}})
        })
    },

    //view all applications
    getApplications: (req, res, next) => {
        //check if employer
        console.log(req.body.id)
        // repo.getEmployerById(req.body.id).then((results) => {
        //     if(results.length === 0) {
        //         res.send("User not registered")
        //         return Promise.reject(new Error("user not registered"))
        //     }
        //     else {
        //         return Promise.resolve()
        //     }
        // }).then(() => {
        //     return repo.getApplications(req.body.userId)
        // }).
        let payload = {}
        let id = req.params.posted_by_id
        let page = req.params.page
        console.log(id)
        if(!id || id < 0) {
            //error 4000 = bad request
            throw Error(4000)
        }
        const order = orders.includes(req.query.order) ? req.query.order : 'date_posted'
        const how = req.query.how==='asc' ? 'asc' : 'desc'
        if(page === 0) page = 1
        const start = 10 * (page - 1) || 0
        const limit = 10
        repo.getApplicationCount(id).then((results) => {
            if(results.length === 0) {
                res.status(200).send({data: {count: 0}})
            }
            else {
                payload.count = results[0][0].count
                return repo.getApplicationsPerPage(order, how, start, limit, id)
            }
        }).then((results) => {
            payload.apps = results
            return repo.deleteNotifications("employer",id)
        }).then((results) => {
            res.status(200).send({data: payload})
            return Promise.resolve()
        }).catch((err) => {
            console.error(err)
            res.status(500).send({error: {statusCode: 500, message: error_messages.server, errorCode: 5000}})
        })
    },

    getApplicationStatus: (req, res, next) => {
        repo.verifyIfApplied(req.params).then((results) => {
            if(results.length === 0) {
                res.status(200).send({applied: 'no'})
            }
            else {
                res.status(200).send({app_id: results[0].app_id, applied: 'yes'})
            }
        }).catch((err) => {
            console.error(err)
            res.status(500).send({error: {statusCode: 500, message: error_messages.server, errorCode: 5000}})
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
        let payload = {}
        let id = req.params.user_id
        let page = req.params.page
        console.log(id)
        if(!id || id < 0) {
            //error 4000 = bad request
            throw Error(4000)
        }
        const order = orders.includes(req.query.order) ? req.query.order : 'date_posted'
        const how = req.query.how==='asc' ? 'asc' : 'desc'
        if(page === 0) page = 1
        const start = 20 * (page - 1) || 0
        const limit = 20
        repo.getApplicationCountSeeker(id).then((results) => {
            
            if(results.length === 0 || results[0][0].count === 0) {
                res.status(200).send({data: {count: 0}})
                return Promise.reject("no error")
            }
            else {
                payload.count = results[0][0].count
                return repo.getApplicationsPerPageSeeker(order, how, start, limit, id)
            }
        }).then((results) => {
            console.log(results)
            payload.apps = results
            res.status(200).send({data: payload})
            return Promise.resolve()
        }).catch((err) => {
            if(err != "no error") {
                console.log(err.message)
                res.status(500).send("Error connecting to database")
            }
        })
    },

    //change application status
    editApplicationStatus: (req, res, next) => {
        // if(!req.body.status) {
        //     res.send("REQUIRED FIELDS NULL")
        //     return
        // 
        console.log(req.body)
        repo.editApplicationStatus(req.params.id, req.body).then(() => {
            return repo.getEmailValuesResult(req.body.user_id, req.params.id)
        }).then((results) => {
            console.log(results)
            const emailValuesSeeker = {
                company_name: results[1][1].company_name,
                first_name: results[0][1].first_name,
                last_name: results[0][1].last_name,
                job_name: results[2][1].job_name,
                // date_posted: new Date(req.body.date_posted),
                to_address: results[0][1].email,
                employer_name: results[1][1].first_name + " " + results[1][1].last_name,
                employer_email: results[1][1].email,
                contact_no: results[1][1].contact_no,
                result: req.body.status
            }
            console.log(emailValuesSeeker)
            helper.sendResultAlertToSeeker(emailValuesSeeker)
        }).then(() => {
            res.status(200).send({success: {job: req.params.id, data: req.body}})
        }).catch((err) => {
            console.log(err)
            res.status(500).send({error:{statusCode:500, message: error_messages.server, errorCode: 5000}})
        })
    },

    //view jobseeker profile (lastname, firstname, email, profile, tags)
    getSeekerProfile: (req, res, next) => {
        try {
            let payload = {}
            repo.getSeekerProfileRedis(req.params.id).then((results) => {
                if(results) {
                    if(req.params.id === results.user_id) {
                        console.log("in redis")
                        return Promise.resolve([results])
                    }
                }
                console.log("not in redis")
                return repo.getSeekerProfile(req.params.id)
            }).then((results) => {
                payload = results[0] 
                delete payload.password
                if(req.query.tags==="true") {
                    return repo.getSeekerTags(req.params.id)
                }
                else {
                    console.log(payload)
                    return Promise.resolve("notags")
                }
            }).then((results) => {
                if(results !== "notags") {
                    payload.tags = JSON.parse(results)
                }
                res.status(200).send({data: payload})
            })
            .catch((err) => {
                console.log(err)
                res.status(500).send({error:{statusCode:500, message: error_messages.server, errorCode: 5000}})
            })
        }
        catch(err) {
            console.log(err)
            res.status(500).send({error:{statusCode:500, message: error_messages.server, errorCode: 5000}})
        }
    },

    getJobsPerPage: (req, res, next) => {
        try {
            let payload = {}
            const order = orders.includes(req.query.order) ? req.query.order : 'date_posted'
            const how = req.query.how==='asc' ? 'asc' : 'desc'
            if(req.params.id < 0) {
                //error 4000 = bad request
                throw Error(4000)
            }
            if(req.params.id === 0) req.params.id = 1
            const limit = req.query.limit || 20
            const start = limit * (req.params.id - 1) || 0
            console.log(req.params)
            /* WITH FILTER */
            if(req.query.l || req.query.f || req.query.t) {
                console.log(req.query.t)
                let filter_flags = []
                let levels = []
                let fields = []
                let types = []
                if(req.query.l && req.query.l !== "") {
                    filter_flags.push("levels")
                    levels = req.query.l ? req.query.l.split(';') : null
                }
                if(req.query.t && req.query.t!== "") {
                    filter_flags.push("types")
                    types = req.query.t ? req.query.t.split(';') : null
                }
                if(req.query.f && req.query.f !== "") {
                    filter_flags.push("fields")
                    fields = req.query.f ? req.query.f.split(';') : null
                }
                Promise.resolve().then(() => {
                    /* LEVEL TIER */
                    if(filter_flags.includes("levels")) { // 1 X X
                        return repo.getJobsWithLevels(levels)
                    }
                    else { // 0 X X
                        return Promise.resolve("no levels")
                    }
                }).then((results) => {
                    /* TYPE TIER */
                    if(!results || results.length === 0) {
                        res.status(200).send({data: {count: 0}})
                        return Promise.reject("no error")
                    }
                    if(results === "no levels") { // 0 X X
                        if(filter_flags.includes("types")) { // 0 1 X
                            return repo.getJobsWithTypesStart(types)
                        }
                        else { // 0 0 X
                            return Promise.resolve("no types nor levels")
                        }
                    }
                    else { // 1 X X
                        if(filter_flags.includes("types")) { // 1 1 X
                            return repo.getJobsWithTypes(types, helper.extractJobIds(results))
                        }
                        else { // 1 0 X
                            return Promise.resolve(results)
                        }
                    }
                }).then((results) => {
                    /* FIELD TIER */
                    if(!results || results.length === 0) {
                        res.status(200).send({data: {count: 0}})
                        return Promise.reject("no error")
                    }
                    if(results === "no types nor levels") { // X 0 X
                        console.log("yo")
                        return repo.getJobsWithFieldsStart(fields)
                    }
                    else { // at least one tier has results
                        if(filter_flags.includes("fields")) {
                            return repo.getJobsWithFields(fields, helper.extractJobIds(results))
                        }
                        else {
                            return Promise.resolve(results)
                        }
                    }
                }).then((results) => {
                    if(req.query.search) {
                        payload.jobs = results
                        return repo.getJobCountFilterSearch(helper.extractJobIds(results), req.query.search)
                    }
                    else {
                        payload.count = results.length
                        return repo.getJobsPerPageFilter(order, how, start, limit, helper.extractJobIds(results))
                    }
                }).then((results) => {
                    console.log(results)
                    if(payload.count) {
                        payload.jobs = results
                        res.status(200).send({data: payload})
                        return Promise.resolve("sent jobs")
                    }
                    else if(results.length === 0 || results[0].count === 0) {
                        res.status(200).send({data: {count: 0}})
                        return Promise.reject("no error")
                    }
                    else {
                        payload.count = results[0].count
                        return repo.getJobsPerPageFilterSearch(order, how, start, limit, helper.extractJobIds(payload.jobs), req.query.search)
                    }
                }).then((results) => {
                    if(results === "sent jobs") {
                        return Promise.resolve()
                    }
                    else {
                        payload.jobs = results
                        res.status(200).send({data: payload})
                        return Promise.resolve()
                    }
                }).catch((err) => {
                    console.error(err)
                    
                    if(err !== "no error") {
                        res.status(500).send({error:{statusCode: 500, message: error_messages.server, errorCode: 5000}})
                    }
                })
            }
            /* END FILTER */
            /* NO FILTER */
            else if(req.query.search) {
                // console.log(req.query.search)
                repo.getJobCountSearch(req.query.search).then((results) => {
                    console.log(results)
                    if(results.length === 0 || results[0][0].count === 0) {
                        console.log("woops")
                        res.status(200).send({data: {count: 0}})
                        return Promise.reject("no error")
                    }
                    else {
                        payload.count = results[0][0].count
                        return repo.getJobsPerPageSearch(order, how, start, limit, req.query.search)
                    }
                }).then((results) => {
                    // console.log(results)
                    if(results.length === 0) {
                        res.status(200).send({data: {count: 0}})
                        return Promise.resolve()
                    }
                    else {
                        payload.jobs = results
                        res.status(200).send({data: payload})
                        return Promise.resolve()
                    }
                }).catch((err) => {
                    console.error(err)
                    if(err !== "no error") {
                        res.status(500).send({error:{statusCode: 500, message: error_messages.server, errorCode: 5000}})
                    }
                })
            }
            else {
                repo.getJobCount().then((results) => {
                    if(results.length === 0 || results[0][0].count === 0) {
                        res.status(200).send({data: {count: 0}})
                        return Promise.reject("no error")
                    }
                    else {
                        payload.count = results[0][0].count
                        return repo.getJobsPerPage(order, how, start, limit)
                    }
                }).then((results) => {
                    console.log(results)
                    if(results.length === 0) {
                    //error 1200 = no jobs found
                    //error 5000 = server error
                        res.status(200).send({data: {count: 0}})
                        return Promise.resolve()
                    }
                    else {
                        payload.jobs = results
                        res.status(200).send({data: payload})
                    }
                }).catch((err) => {
                    console.error(err)
                    if(err !== "no error") {
                        res.status(500).send({error:{statusCode: 500, message: error_messages.server, errorCode: 5000}})
                    }
                })
            }
        }
        catch(err) {
            console.error(err)
            if(err.message === 4000) {
                res.status(400).send({error:{statusCode:400, message: error_messages.bad_page, errorCode: 4000}})
            }
            else {
                res.status(500).send({error:{statusCode: 500, message: error_messages.server, errorCode: 5000}})
            }
        }
    },

    getJobsPerPageEmployer: (req, res, next) => {
        try {
            // console.log(req.session.id)
            let start = 0
            let payload = {}
            // let id = 0
            const order = orders.includes(req.query.order) ? req.query.order : 'date_posted'
            const how = req.query.how==='asc' ? 'asc' : 'desc'
            const id = req.query.posted_by_id //TESTING ONLY
            // if(!req.session.user || req.session.user.role != "employer") {
            //     throw new Error("not logged in")
            // }
            // else {
            //     id = req.session.user.user_id
            // }
            const limit = req.query.limit || 20
            if(!req.params.id || req.params.id == 0) {
                start = 0
            }
            else {
                start = limit * (req.params.id - 1) || 0
            }
            
            
            repo.getJobCountEmployer(id).then((results) => {
                if(results.length === 0) {
                    res.status(200).send({data: {count: 0}})
                    return Promise.reject("no error") 
               }
                else {
                    payload.count = results[0][0].count
                    return repo.getJobsPerPageEmployer(order, how, start, limit, id)
                }
            }).then((results) => {
                if(results.length === 0) {
                //error 1200 = no jobs found
                //error 5000 = server error
                    res.status(200).send({data: {count: 0}})
                    return Promise.reject("no error")
                }
                else {
                    payload.jobs = results
                    res.status(200).send({data: payload})
                }
            }).catch((err) => {
                console.error(err)
                if(err != "no error") {
                    res.status(500).send({error:{statusCode: 500, message: error_messages.server, errorCode: 5000}})
                }
            })

        }
        catch(err) {
            console.error(err)
            if(err.message === 4000) {
                res.status(400).send({error:{statusCode:400, message: error_messages.bad_page, errorCode: 4000}})
            }
            else {
                res.status(500).send({error:{statusCode: 500, message: error_messages.server, errorCode: 5000}})
            }
        }
    },

    getJobCount: (req, res, next) => {
        repo.getJobCount().then((results) => {
            res.status(200).send({data: results[0][0]})
        }).catch((err) => {
            console.log(err)
            res.status(500).send({error: {statusCode:500, message: error_messages.server, errorCode: 5000}})
        })
    },

    getJobCountEmployer: (req, res, next) => {
        console.log("YAY")
        console.log(req.query)
        const id = req.query.posted_by_id //TESTING ONLY
        // console.log(req.session.id)
        // let id = 0
        // if(!req.session.user || req.session.user.role != "employer") {
        //     throw new Error("not logged in")
        // }
        // else {
        //     id = req.session.user.user_id
        // }
        repo.getJobCountEmployer(id).then((results) => {
            res.status(200).send({data: results[0][0]})
        }).catch((err) => {
            console.log(err)
            res.status(500).send({error: {statusCode:500, message: error_messages.server, errorCode: 5000}})
        })
    },

    getOptions: (req, res, next) => {
        const payload = {}
        repo.getOptions().then((data) => {
            payload.levels = data[0][1]
            payload.types = data[1][1]
            payload.skills = data[2][1]
            payload.fields = data[3][1]
            payload.educations = data[4][1]
            payload.genders = data[5][1]
            payload.sorts = helper.sorts
            console.log(payload)
            res.status(200).send({data: payload})
        })
    },

    getAllRedis: (req, res, next) => {
        repo.getAllRedis().then((results) => {
            console.log(results)
            res.status(200).send({data: results})
        })
    },

    getRedisKey: (req, res, next) => {
        repo.getRedisKey(req.params.key).then((data) => {
            res.status(200).send({data: data})
        })
    },

    postOptions: (req, res, next) => {
        repo.postRedisOptions(helper.options).then(() => {
            res.status(200).send({data: "Options uploaded!"})
        })
    },

    getSignedUrl: (req, res, next) => {
        try {
            const payload = {}
            if(req.body.pic_url) {
                const ext = req.body.pic_url.split('.')[req.body.pic_url.split('.').length-1]
                if(!helper.options.image_exts.includes(ext)) {
                    throw new Error(error_messages.bad_format)
                }
                const url = s3.getSignedUrl('putObject', {
                    Bucket: "jobseeker-file-bucket", 
                    Key: req.body.pic_url, 
                    Expires: 60 * 5, 
                    ACL: "bucket-owner-full-control",
                    ContentType: "image/" + req.body.pic_url.split('.')[req.body.pic_url.split('.').length-1]
                })
                payload.pic_url = url
            }
            if(req.body.resume_url) {
                let contenttype = ""
                const ext = req.body.resume_url.split('.')[req.body.resume_url.split('.').length-1]
                if(ext === "docx" || ext === "doc") {
                    contenttype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                }
                else if(ext === "pdf") {
                    contenttype = "application/pdf"
                }
                else {
                    throw new Error(error_messages.bad_format)
                }
                const url = s3.getSignedUrl('putObject', {
                    Bucket: "jobseeker-file-bucket", 
                    Key: req.body.resume_url, 
                    Expires: 60 * 5, 
                    ACL: "bucket-owner-full-control",
                    ContentType: contenttype
                })
                payload.resume_url = url
            }
            console.log(payload)
            res.status(200).send({data: payload})
        }
        catch(err) {
            console.log(err)
            if(err.message === error_messages.bad_format) {
                //4110: BAD FILE FORMAT
                res.status(400).send({error:{statusCode:400, message:err.message, errorCode: 4110}})
            }
            else {
                res.status(500).send({error: {statusCode:500, message:error_messages.server, errorCode: 1}})
            }
        }  
    }
 }