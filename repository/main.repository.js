const knex = require('knex')({
    client: 'mysql', 
    connection: {
        host: 'localhost',
        port: '3306',
        user: 'root',
        password: 'root',
        database: 'jobfinder'
    }
})

module.exports = {
    //create account
    createAccount: (role, data) => {
        if(role === 'candidate') {
            return knex.raw("INSERT INTO seeker_accounts VALUES(null,?,?,?,?,?)", 
                            [data.lastname, data.firstname, data.email, data.password, role])
                        .then((data) => { //initialize user profile
                            return knex.raw("INSERT INTO seeker_profile(user_id) VALUES(?)",
                                     [data[0].insertId])
                        })
        }
        else if(role === 'employer') {
            return knex.raw("INSERT INTO recruiters VALUES(null,?,?,?,?,?,?,?)",
                            [data.email, data.password, data.company, data.lastname,
                             data.firstname, data.contact, role])
                        .then((results) => { //initialize user profile
                        return knex.raw("INSERT INTO company_profile(company_id, name, recruiter_id) VALUES(null, ?, ?)",
                                    [data.company, results[0].insertId])
                        })
        }
        else {
            return Promise.reject(new Error("role unknown"))
        }
    },

    //login account
    loginAccount: (role, data) => {
        if(role === 'candidate') {
            return knex.raw("SELECT * FROM seeker_accounts WHERE email = ? AND password = ?", 
                            [data.email, data.password])
        }
        else if(role === 'employer') {
            return knex.raw("SELECT * FROM recruiters WHERE email = ? AND password = ?",
                            [data.email, data.password])
        }
        else {
            return Promise.reject(new Error("role unknown"))
        }
    },

    //delete account
    delAccount: (role, userId) => {
        if(role === 'candidate') {
            return knex.raw("DELETE FROM seeker_accounts WHERE user_id = ?", 
                            [userId])
                        .then(() => {
                            return knex.raw("DELETE FROM seeker_tags WHERE user_id = ?", [userId])
                        })
        }
        else if(role === 'employer') {
            return knex.raw("DELETE FROM recruiters WHERE user_id = ?",
                            [userId])
                        .then(() => {
                            return knex.raw("DELETE FROM job_post WHERE posted_by_id = ?", [userId])
                        })
                        .then(() => {
                            return knex.raw("DELETE FROM job_tags WHERE posted_by_id = ?", [userId])
                        })
                        .then(() => {
                            return knex.raw("DELETE FROM company_profile WHERE recruiter_id = ?", userId)
                        })
        }
        else {
            return Promise.reject(new Error("role unknown"))
        }
    },

    //getCompanyOfRecruiter
    getCompanyOfRecruiter: (key) => {
        return knex.raw("SELECT company_id FROM company_profile WHERE company_name = ?", [compId])
    },

    //get all accounts
    getAllSeekers: () => {
        return knex.select('*').from('seeker_accounts')
    },

    getAllEmployers: () => {
        return knex.select('*').from('recruiters')
    },

    //get specific seeker
    getSeeker: (userId, data) => {
        return knex.select('*').from('seeker_accounts').where({user_id: userId, email: data.email})
    },

    //get seeker by email
    getSeekerAccount: (data) => {
        return knex.select('*').from('seeker_accounts').where({email:data})
    },

    //get specific employer
    getEmployer: (userId) => {
        return knex.select('*').from('recruiters').where({user_id: userId})
    },

    //get employer by email
    getEmployerAccount: (key, data) => {
        return knex.select('*').from('recruiters').where({user_id:key, email:data})
    },

    //get company account
    getCompanyAccount: (data) => {
        return knex.select('*').from('company_profile').where({name:data})
    },

    //delete company profile
    delCompanyProfile: (data) => {
        return knex.raw("DELETE FROM recruiters WHERE company_name = ?", data)
    },

    //edit seeker profile **ADD EDUCATION, INTERESTS**
    editSeekerProfile: (key, data) => {
        return knex.raw("UPDATE seeker_profile SET contact_no = ?, preferred_level = ?, salary_per_month = ?, resume = ? WHERE user_id = ?", 
                        [data.contact, data.level, data.salary, data.resume, key])
    },

    //create seeker skill set
    addSeekerTags: (key, data) => {
        return knex.raw("INSERT INTO seeker_tags VALUES(null,?,?,?)",
                         [key, data.tag, data.type]).then(null,console.log)
    },

    //delete seeker tags
    delSeekerTags: (key) => {
        return knex.raw("DELETE FROM seeker_tags WHERE user_id = ?",
                         [key]).then(null,console.log)
    },

    //edit company profile
    editCompanyProfile: (data) => {
        return knex.raw("UPDATE company_profile SET name = ?, website = ?, description = ?, establishment_date = ?, location = ? WHERE company_id = ?", 
                        [data.company, data.website, data.desc, data.establish, data.location, data.basis])
    },

    //get company profile
    getCompanyProfile: (data) => {
        return knex.select('*').from('company_profile').where({name:data})
    },

    //get all companies
    getAllCompanies: () => {
        return knex.select('*').from('company_profile')
    },

    //create job post
    createJobPost: (data) => {
        return knex.raw("INSERT INTO job_post VALUES(null,?,?,?,?,?,?,?,?,?,?)",
                        [data.jobname, data.company, data.type, data.level, data.recruiter,
                         data.location, data.desc, data.qual, data.isopen, data.post]).then(null, console.log)
    },

    //edit job post
    editJobPost: (jobId, data) => {
        return knex.raw("UPDATE job_post SET job_name = ?, type = ?, level = ?, job_location = ?, description = ?, qualifications = ?, is_open = ? WHERE job_id = ?", 
                        [data.jobname, data.type, data.level, data.location, data.desc, data.qual, data.isopen, jobId]).then(null, console.log)
    },

    addJobTags: (jobId, userId, data) => {
        return knex.raw("INSERT INTO job_tags VALUES(?,?,?,?)",
                         [jobId, userId, data.tag, data.type]).then(null,console.log)
    },

    //delete seeker tags
    delJobTags: (jobId) => {
        return knex.raw("DELETE FROM job_tags WHERE job_id = ?",
                         [jobId]).then(null,console.log)
    },

    //delete job post
    delJobPost: (jobId) => {
        return knex.raw("DELETE FROM job_post WHERE job_id = ?", [jobId]).then(null,console.log)
    },

    //view job list
    getJobList: () => {
        return knex.raw("SELECT * FROM job_post")
    },

    //get jobs posted by employer account
    getJobListByPoster: (userId) => {
        return knex.select('*').from('job_post').where({posted_by_id:userId})
    },

    //view job post
    getJobPost: (data) => {
        //  return knex.raw("SELECT * FROM job_post WHERE job_id = 1")
        return knex.select('*').from('job_post').where({'job_name': data.jobname, 'company_name': data.company})
    },

    //get jobs by id
    getJobById: (jobId) => {
        //  return knex.raw("SELECT * FROM job_post WHERE job_id = 1")
        return knex.select('*').from('job_post').where({'job_id': jobId})
    },

    getJobByEmployer: (jobId, userId) => {
        return knex.select('*').from('job_post').where({'job_id': jobId, 'posted_by_id': userId})
    },

    //get company from id
    getCompanyFromId: (compId) => {
        return knex.select('*').from('company_profile').where({company_id:compId})
    },

    //get recruiter from id
    getEmployerFromId: (userId) => {
        return knex.select('*').from('recruiters').where({user_id:userId})
    },

    getMatchingTags: (userId) => {
        // return knex.select('*').from('seeker_tags').innerJoin('job_tags', 'seeker_tags.user_id', 'job_tags.job_id')
        return knex.raw("SELECT job_id, COUNT(*) AS match_count FROM job_tags INNER JOIN seeker_tags ON job_tags.tag = seeker_tags.tag WHERE seeker_tags.user_id = ? GROUP BY job_tags.job_id", [userId])
    },

    verifyJobStatus: (jobId) => {
        return knex.select('is_open').from('job_post').where({job_id:jobId})
    },

    verifyIfApplied: (data) => {
        return knex.select('*').from('applications').where({job_id:jobId, user_id:userId})
    },

    applyForJob: (data) => {
        return knex.raw("INSERT INTO applications VALUES(null,?,?,?,?)", 
                         [data.userId, data.jobId, data.recId, "pending"])
    },

    getApplications: (userId) => {
        return knex.select('*').from('applications').where({recruiter_id:userId})
    },

    getApplicationsForJob: (jobId) => {
        return knex.select('*').from('applications').where({job_id:jobId})
    },

    editApplicationStatus: (jobId, data) => {
        return knex.raw("UPDATE applications SET status = ? WHERE job_id = ? AND user_id = ?", [data.status, jobId, data.userId])
    }
}