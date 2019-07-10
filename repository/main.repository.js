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
        if(role === 'seeker') {
            return knex.raw("INSERT INTO seeker_accounts VALUES(null,?,?,?,?,?)", 
                            [data.lastname, data.firstname, data.email, data.password, role])
                        .then((data) => { //initialize user profile
                            return Promise.all([
                                    knex.raw("INSERT INTO seeker_profile(user_id) VALUES(?)",
                                     [data[0].insertId]),
                                    knex.raw("INSERT INTO seeker_tags(user_id, tag, tag_type) VALUES(?,'','level')", [data[0].insertId])
                                ])
                        })
        }
        else if(role === 'employer') {
            return knex.raw("INSERT INTO recruiters VALUES(null,?,?,?,?,?,?,?)",
                            [data.email, data.password, data.company, data.lastname,
                             data.firstname, data.contact, role])
                        .then((results) => { //initialize user profile
                        return knex.raw("INSERT INTO company_profile(company_id, name) VALUES(?, ?)",
                                    [results[0].insertId, data.company])
                        })
        }
        else {
            return Promise.reject(new Error("role unknown"))
        }
    },

    //login account
    loginAccount: (role, data) => {
        if(role === 'seeker') {
            return knex.select('*').from('seeker_accounts').where({email:data.email, password:data.password})
        }
        else if(role === 'employer') {
            return knex.select('*').from('recruiters').where({email:data.email, password:data.password})
        }
        else {
            return Promise.reject(new Error("role unknown"))
        }
    },
    
    //edit account
    editAccount: (role, userId, data) => {
        if(role === 'seeker') {
            return knex.raw("UPDATE seeker_accounts SET last_name=?, first_name=?, email=?, password=? WHERE user_id = ?", 
                            [data.lastname, data.firstname, data.email, data.password, userId])
        }
        else if(role === 'employer') {
            return knex.raw("UPDATE recruiters SET last_name=?, first_name=?, email=?, password=? WHERE user_id = ?", 
                            [data.lastname, data.firstname, data.email, data.password, userId])
        } 
    },

    //delete account
    delAccount: (role, userId) => {
        if(role === 'seeker') {
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
                            return knex.raw("DELETE FROM company_profile WHERE company_id = ?", userId)
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
    getSeekerById: (userId) => {
        return knex.select('*').from('seeker_accounts').where({user_id: userId})
    },

    //get specific seeker profile
    getSeekerProfile: (userId) => {
        return knex.select('*')
                    .from('seeker_accounts')
                    .join('seeker_profile', 'seeker_accounts.user_id', '=', 'seeker_profile.user_id')
                    .where({'seeker_accounts.user_id': userId})
    },

    getSeekerTags: (userId) => {
        return knex.select('tag', 'tag_type')
                    .from('seeker_tags')
                    .where({'user_id': userId})
                    .whereNot({tag_type:'level'})
    },

    //get seeker by email
    getSeekerByEmail: (data) => {
        return knex.select('*').from('seeker_accounts').where({email:data})
    },

    //get specific employer
    getEmployerById: (userId) => {
        return knex.select('*').from('recruiters').where({user_id: userId})
    },

    //get employer by email
    getEmployerByEmail: (data) => {
        return knex.select('*').from('recruiters').where({email:data})
    },

    //get company account
    getCompanyByName: (data) => {
        return knex.select('*').from('company_profile').where({name:data})
    },

    //get company account
    getCompanyById: (data) => {
        return knex.select('company_profile.company_id',
                           'company_profile.name', 
                           'company_profile.website', 
                           'company_profile.description', 
                           'company_profile.establishment_date', 
                           'company_profile.location',
                           'recruiters.email',
                           'recruiters.contact_no')
                    .from('company_profile')
                    .join('recruiters', 'recruiters.user_id', '=', 'company_profile.company_id')
                    .where({'company_profile.company_id':data})
    },

    //delete company profile
    delCompanyProfile: (data) => {
        return knex.raw("DELETE FROM recruiters WHERE company_name = ?", data)
    },

    //edit seeker profile **ADD EDUCATION, INTERESTS**
    editSeekerProfile: (key, data) => {
        return knex.raw("UPDATE seeker_profile SET contact_no = ?, gender=?, birthdate=?, salary_per_month = ?, education=?, level=? WHERE user_id = ?", 
                        [data.contact_no, data.gender, data.birthdate, data.salary_per_month, data.education, data.level, key])
                    .then(() => {
                        knex.raw("UPDATE seeker_tags SET tag=? WHERE user_id = ? AND tag_type='level'",
                            [data.level, key])
                    })
    },

    //create seeker skill set
    addSeekerTags: (key, data) => {
        return knex.raw("INSERT INTO seeker_tags VALUES(null,?,?,?)",
                         [key, data.tag, data.tag_type]).then(null,console.log)
    },

    //delete seeker tags
    delSeekerTags: (key) => {
        return knex.raw("DELETE FROM seeker_tags WHERE user_id = ? AND NOT(tag_type='level')",
                         [key]).then(null,console.log)
    },

    //edit company profile
    editCompanyProfile: (key, data) => {
        return knex.raw("UPDATE company_profile SET name = ?, website = ?, description = ?, establishment_date = ?, location = ? WHERE company_id = ?", 
                        [data.name, data.website, data.description, data.establishment_date, data.location, key])
                    .then(() => {
                        return knex.raw("UPDATE recruiters SET company_name = ?, contact_no = ? WHERE user_id = ?", 
                        [data.name, data.contact_no, key])
                    })
    },

    //get company profile
    getCompanyProfile: (data) => {
        return knex.select('company_profile.company_id',
                           'company_profile.name', 
                           'company_profile.website', 
                           'company_profile.description', 
                           'company_profile.establishment_date', 
                           'company_profile.location',
                           'recruiters.email',
                           'recruiters.contact_no')
                    .from('company_profile')
                    .join('recruiters', 'recruiters.user_id', '=', 'company_profile.company_id')
                    .where({'company_profile.company_id':data})
    },

    //get all companies
    getAllCompanies: () => {
        return knex.select('*').from('company_profile')
    },

    //create job post
    createJobPost: (id, data) => {
        return knex.raw("INSERT INTO job_post VALUES(null,?,?,?,?,?,?,?,?,?,?,?)",
                        [data.job_name, data.company_name, data.type, data.level, id,
                         data.job_location, data.description, data.qualifications, "yes", data.date_posted, data.date_deadline])
                    .then((res) => {
                        const job_id = res[0].insertId
                        return Promise.all([
                                    knex.raw("INSERT INTO job_tags VALUES(?,?,?,?)",
                                        [job_id, id, data.type, "type"]),
                                    knex.raw("INSERT INTO job_tags VALUES(?,?,?,?)", [
                                        job_id, id, data.level, "level"])
                                    ]).then(() =>{return Promise.resolve(job_id)})
                    })
    },

    //edit job post
    editJobPost: (jobId, data) => {
        return knex.raw("UPDATE job_post SET job_name = ?, type = ?, level = ?, job_location = ?, description = ?, qualifications = ?, is_open = ?, date_deadline = ? WHERE job_id = ?", 
                        [data.job_name, data.type, data.level, data.job_location, data.description, data.qualifications, data.is_open, data.date_deadline, jobId]).then(console.log, console.log)
                    .then(() => {
                        return Promise.all([
                                    knex.raw("UPDATE job_tags SET tag=? WHERE job_id = ? AND tag_type='type'",
                                        [data.type, jobId]),
                                    knex.raw("UPDATE job_tags SET tag=? WHERE job_id = ? AND tag_type='level'",
                                        [data.level, jobId])
                                    ])
                    })
    },

    addJobTags: (jobId, userId, data) => {
        return knex.raw("INSERT INTO job_tags VALUES(?,?,?,?)",
                         [jobId, userId, data.tag, data.tag_type]).then(null,console.log)
    },

    //delete seeker tags
    delJobTags: (jobId) => {
        return knex.raw("DELETE FROM job_tags WHERE job_id = ? AND NOT(tag_type = 'type' OR tag_type='level') " ,
                         [jobId]).then(null,console.log)
    },

    getJobTags: (jobId) => {
        return knex.select('tag', 'tag_type')
                    .from('job_tags')
                    .whereRaw("job_id = ? AND NOT(tag_type='type' OR tag_type='level')", [jobId])
    },

    //delete job post
    delJobPost: (jobId) => {
        return knex.raw("DELETE FROM job_post WHERE job_id = ?", [jobId]).then(null,console.log)
    },

    //delete applications
    delApplications: (jobId) => {
        return knex.raw("DELETE FROM applications WHERE job_id = ?", [jobId])
    },

    //view job list
    getJobList: () => {
        // return knex.raw("SELECT * FROM job_post ORDER BY date_posted DESC")
        return knex.select('*').from('job_post').orderBy('date_posted', 'desc')
    },

    //get jobs posted by employer account
    getJobListByPoster: (userId) => {
        return knex.select('*').from('job_post').where({posted_by_id:userId}).orderBy('date_posted','desc')
    },

    //view job post
    getJobPost: (data) => {
        //  return knex.raw("SELECT * FROM job_post WHERE job_id = 1")
        return knex.select('*').from('job_post').where({'job_name': data.jobname, 'company_name': data.company})
    },

    //get jobs by id
    getJobById: (jobId) => {
        //  return knex.raw("SELECT * FROM job_post WHERE job_id = 1")
        return knex.select('*')
                    .from('job_post')
                    .where({'job_post.job_id': jobId})
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

    getMatchingTags: (userId, offset, limit) => {
        return knex.raw("SELECT job_id, COUNT(*) AS match_count FROM job_tags INNER JOIN seeker_tags ON job_tags.tag = seeker_tags.tag WHERE seeker_tags.user_id = ? GROUP BY job_tags.job_id ORDER BY match_count DESC LIMIT ?,?", [userId, offset, limit])
    },

    verifyJobStatus: (job_id) => {
        return knex.select('is_open').from('job_post').where({job_id:job_id})
    },

    verifyIfApplied: (data) => {
        return knex.select('*').from('applications').where({job_id:data.job_id, user_id:data.user_id})
    },

    getApplicationStatusById: (id) => {
        return knex.select('status').from('applications').where({app_id:id})
    },

    applyForJob: (data) => {
        return knex.raw("INSERT INTO applications VALUES(null,?,?,?,?,?)", 
                         [data.user_id, data.job_id, data.posted_by_id, "pending", data.date_posted])
    },

    getApplication: (data) => {
        return knex.select('*').from('applications').where({job_id:data.job_id, user_id:data.user_id})
    },

    delApplication: (id) => {
        return knex.raw("DELETE FROM applications WHERE app_id=?", id)
    },

    getApplicationsForJob: (jobId) => {
        return knex.select('*').from('applications').where({job_id:jobId}).orderBy('date_applied', 'desc')
    },

    editApplicationStatus: (jobId, data) => {
        return knex.raw("UPDATE applications SET status = ? WHERE job_id = ? AND user_id = ?", [data.status, jobId, data.user_id])
    },

    getJobsPerPage: (order, how, offset, limit) => {
        // return knex.raw("SELECT * FROM jobs ORDER BY job_posted DESC LIMIT ?, ?", [start, end])
        console.log(order + how + offset + limit)
        return knex.select('*').from('job_post').orderBy(order, how).offset(offset).limit(limit)
    },

    getJobsPerPageEmployer: (order, how, offset, limit, id) => {
        // return knex.raw("SELECT * FROM jobs ORDER BY job_posted DESC LIMIT ?, ?", [start, end])
        console.log(order + how + offset + limit)
        return knex.select('*').from('job_post').where({'posted_by_id':id}).orderBy(order, how).offset(offset).limit(limit)
    },

    getJobsByTag: (tag) => {
        return knex.raw("SELECT job_id FROM jobfinder.job_tags WHERE tag=?  GROUP BY job_id;", [tag])
    },

    getJobsById: (job_id) => {
        return knex.select('*').from('job_post').where({'job_id': job_id})
    },

    getJobCount: () => {
        return knex.raw("SELECT COUNT(*) AS count FROM job_post")
    },

    getJobCountEmployer: (id) => {
        return knex.raw("SELECT COUNT(*) AS count FROM job_post WHERE posted_by_id=?", [id])
    },

    getApplicationsPerPage: (order, how, offset, limit, id) => {
        return knex.select('app_id', 'applications.user_id', 'status', 'seeker_accounts.last_name', 'seeker_accounts.first_name', 'applications.job_id', 'applications.posted_by_id', 'applications.date_posted', 'job_name', 'company_name', 'is_open')
                   .from('applications')
                   .join('job_post', 'applications.job_id', '=', 'job_post.job_id')
                   .join('seeker_accounts', 'seeker_accounts.user_id', '=', 'applications.user_id')
                   .where({'applications.posted_by_id':id})
                   .orderBy(order, how)
                   .offset(offset)
                   .limit(limit)
    },

    getApplicationsPerPageSeeker: (order, how, offset, limit, id) => {
        // return knex.select('app_id', 'user_id', 'applications.job_id', 'applications.posted_by_id', 'applications.date_posted', 'job_name', 'company_name').from('applications').where({'user_id':id}).orderBy(order, how).offset(offset).limit(limit)
        return knex.select('app_id', 'user_id', 'status', 'applications.job_id', 'applications.posted_by_id', 'applications.date_posted', 'job_name', 'company_name', 'is_open')
        .from('applications')
        .join('job_post', 'applications.job_id', '=', 'job_post.job_id')
        .where({'applications.user_id':id})
        .orderBy(order, how)
        .offset(offset)
        .limit(limit)
    },

    getApplicationCount: (id) => {
        return knex.raw("SELECT COUNT(*) AS count FROM applications WHERE posted_by_id=?", [id])
    },

    getApplicationCountSeeker: (id) => {
        return knex.raw("SELECT COUNT(*) AS count FROM applications WHERE user_id=?", [id])
    }
}