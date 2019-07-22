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

const Redis = require('ioredis')
const redis = new Redis({
    port: 6379,
    host: 'localhost',
    family: 4,
    // password: 'root',
    db: 0
})

module.exports = {

    createAccountSeeker: (data) => {
        return knex.raw("INSERT INTO seeker_accounts VALUES(null,?,?,?,?,?)", 
                            [data.lastname, data.firstname, data.email, data.password, "seeker"])
                        .then((results) => { //initialize user profile
                            return knex.raw("INSERT INTO seeker_tags(user_id, tag, tag_type) VALUES(?,'','level')", [results[0].insertId])
                            .then(() => {
                                    return redis.pipeline()
                                                .hmset('seeker:'+results[0].insertId, {
                                                        'user_id': results[0].insertId,
                                                        'email': data.email, 
                                                        'password': data.password, 
                                                        'last_name': data.lastname, 
                                                        'first_name': data.firstname,
                                                        'role': 'seeker',
                                                        'contact_no': "",
                                                        'gender': "",
                                                        'birthdate': "",
                                                        'salary_per_month': "",
                                                        'education': "",
                                                        'level': "",
                                                        'pic_url': "",
                                                        'pic_url_old': "",
                                                        'app_notifications': "0"})
                                                .set(`seeker:email:${data.email}`, results[0].insertId)
                                                .exec()
                                })
                        })
    },

    createAccountEmployer: (data) => {
        return knex.raw("INSERT INTO recruiters VALUES(null,?,?,?,?,?,?,?)",
                            [data.email, data.password, data.company, data.lastname,
                             data.firstname, data.contact, "employer"])
                    .then((results) => { //initialize user profile
                    return redis.pipeline()
                                .hmset('employer:'+results[0].insertId, {
                                        'user_id': results[0].insertId,
                                        'email': data.email, 
                                        'password': data.password, 
                                        'last_name': data.lastname, 
                                        'first_name': data.firstname, 
                                        'company_name': data.company, 
                                        'contact_no': data.contact,
                                        'role': 'employer',
                                        'app_notifications': "0"})
                                .set(`employer:email:${data.email}`, results[0].insertId)
                                .hmset('company:'+results[0].insertId, {
                                    'company_id': results[0].insertId,
                                    'email': data.email,
                                    'name': data.company,
                                    'contact_no': data.contact,
                                    'website': data.website,
                                    'description': data.description,
                                    'establishment_date': data.establishment_date,
                                    'location': data.location,
                                    'pic_url': "",
                                    'pic_url_old': "",
                                    'resume_url': "",
                                    'resume_url_old': ""
                                })
                                .exec()
        })
    },

    //login account seeker
    loginAccountSeeker: (data) => {
        return knex.select('*').from('seeker_accounts').where({email:data.email, password:data.password})
    },

    loginAccountSeekerRedis: (key) => {
        return redis.get(`seeker:email:${key}`).then((data) => {
            return redis.hgetall(`seeker:${data}`)
        })
    },

    //login account employer
    loginAccountEmployer: (data) => {
        return knex.select('*').from('recruiters').where({email:data.email, password:data.password})
    },

    loginAccountEmployerRedis: (key) => {
        console.log(key)
        return redis.get(`employer:email:${key}`).then((data) => {
            return redis.hgetall(`employer:${data}`)
        })   
    },
    
    //edit account
    editAccountSeeker: (userId, data) => {
        return knex.raw("UPDATE seeker_accounts SET last_name=?, first_name=?, email=?, password=? WHERE user_id = ?", 
                            [data.lastname, data.firstname, data.email, data.password, userId])
                        .then(() => {
                            return redis.hget(`seeker:${userId}`, 'email').then((results) => {
                                return redis.pipeline()
                                            .hmset('seeker:'+userId, {
                                                    'user_id': userId,
                                                    'email': data.email, 
                                                    'password': data.password, 
                                                    'last_name': data.lastname, 
                                                    'first_name': data.firstname})
                                            .del(`seeker:email:${results}`)
                                            .set(`seeker:email:${data.email}`, userId)
                                            .exec()
                            })
                        })
    },

    //edit account
    editAccountEmployer: (userId, data) => {
        return knex.raw("UPDATE recruiters SET last_name=?, first_name=?, email=?, password=? WHERE user_id = ?", 
                        [data.lastname, data.firstname, data.email, data.password, userId])
                    .then(() => {
                        return redis.hget(`employer:${userId}`, 'email').then((results) => {
                            return redis.pipeline()
                                        .hmset(`employer:${userId}`, {
                                                'user_id': userId,
                                                'email': data.email, 
                                                'password': data.password, 
                                                'last_name': data.lastname, 
                                                'first_name': data.firstname})
                                        .del(`employer:email:${results}`)
                                        .set(`employer:email:${data.email}`, userId)
                                        .hset(`company:${userId}`, 'email', data.email)
                                        .exec()
                        })
                    })
                        
    },

    //delete account seeker
    delAccountSeeker: (userId) => {
        return knex.raw("DELETE FROM seeker_accounts WHERE user_id = ?", 
                        [userId])
                    .then(() => {
                        return knex.raw("DELETE FROM seeker_tags WHERE user_id = ?", [userId])
                    })
                    .then(() => {
                        return redis.hget(`seeker:${userId}`, 'email').then((email) => {
                            return redis.pipeline()
                                        .del(`seeker:email:${email}`)
                                        .del(`seeker:`+userId)
                                        .exec()
                        })
                    })
    },

    //delete account
    delAccountEmployer: (userId) => {
        return knex.raw("DELETE FROM recruiters WHERE user_id = ?",
                            [userId])
                        .then(() => {
                            return knex.raw("DELETE FROM job_post WHERE posted_by_id = ?", [userId])
                        })
                        .then(() => {
                            return knex.raw("DELETE FROM job_tags WHERE posted_by_id = ?", [userId])
                        }).then(() => {
                            return redis.hget(`employer:${userId}`, 'email').then((email) => {
                                return redis.pipeline()
                                            .del(`employer:email:${email}`)
                                            .del(`employer:`+userId)
                                            .exec()
                            })
                        })
    },

    //get all accounts
    getAllSeekers: () => {
        return knex.select('*').from('seeker_accounts')
    },

    getSeekerRedis:(key) => {
        return redis.hgetall('user:'+key)
    },

    getAllEmployers: () => {
        return knex.select('*').from('recruiters')
    },

    //get specific seeker
    getSeekerById: (userId) => {
        return knex.select('*').from('seeker_accounts').where({user_id: userId})
    },

    //get specific seeker redis
    getSeekerByIdRedis: (userId) => {
        return redis.hgetall(`seeker:${userId}`)
    },

    //get specific seeker profile
    getSeekerProfile: (userId) => {
        return knex.select('*')
                    .from('seeker_accounts')
                    .join('seeker_profile', 'seeker_accounts.user_id', '=', 'seeker_profile.user_id')
                    .where({'seeker_accounts.user_id': userId})
    },

    getSeekerProfileRedis: (userId) => {
        return redis.hgetall(`seeker:${userId}`)
    },

    getSeekerTags: (userId) => {
        // return knex.select('tag', 'tag_type')
        //             .from('seeker_tags')
        //             .where({'user_id': userId})
        //             .whereNot({tag_type:'level'})
        return redis.get(`seeker:tags:${userId}`)
    },

    //get seeker by email
    getSeekerByEmail: (data) => {
        // return knex.select('*').from('seeker_accounts').where({email:data})
        return redis.get(`seeker:email:${data}`)
    },

    //get specific employer
    getEmployerById: (userId) => {
        return knex.select('*').from('recruiters').where({user_id: userId})
    },

    getEmployerByIdRedis: (userId) => {
        return redis.hgetall(`employer:${userId}`)
    },

    //get employer by email
    getEmployerByEmail: (data) => {
        // return knex.select('*').from('recruiters').where({email:data})
        return redis.get(`employer:email:${data}`)
    },

    //get company account
    getCompanyByName: (data) => {
        // return knex.select('*').from('company_profile').where({name:data})
        return redis.get(`employer:email:${data}`).then((res) => {
            return redis.hget(`company:${res}`, 'email')
        })
    },

    //get company account
    // getCompanyById: (data) => {
    //     return knex.select('company_profile.company_id',
    //                        'company_profile.name', 
    //                        'company_profile.website', 
    //                        'company_profile.description', 
    //                        'company_profile.establishment_date', 
    //                        'company_profile.location',
    //                        'recruiters.email',
    //                        'recruiters.contact_no')
    //                 .from('company_profile')
    //                 .join('recruiters', 'recruiters.user_id', '=', 'company_profile.company_id')
    //                 .where({'company_profile.company_id':data})
    // },

    getCompanybyIdRedis: (data) => {
        return redis.hgetall(`company:${data}`)
    },

    //delete company profile
    // delCompanyProfile: (data) => {
    //     return knex.raw("DELETE FROM recruiters WHERE company_name = ?", data)
    // },

    //edit seeker profile **ADD EDUCATION, INTERESTS**
    editSeekerProfile: (key, data) => {
        console.log(data)
        return knex.raw("UPDATE seeker_tags SET tag=? WHERE user_id = ? AND tag_type='level'",
                        [data.level, key])
                    .then(() => {
                        return redis.hmset(`seeker:${key}`, {
                            'contact_no': data.contact_no,
                            'gender': data.gender,
                            'birthdate': data.birthdate,
                            'salary_per_month': data.salary_per_month,
                            'education': data.education,
                            'level': data.level,      
                        })
                    })
    },

    addSeekerPic: (key, url) => {
        return redis.hget(`seeker:${key}`, 'pic_url').then((url_old) => {
            return redis.hmset(`seeker:${key}`, {'pic_url': url, 'pic_url_old': url_old})
        })
    },

    addSeekerResume: (key, url) => {
        return redis.hget(`seeker:${key}`, 'resume_url').then((url_old) => {
            return redis.hmset(`seeker:${key}`, {'resume_url': url, 'resume_url_old': url_old})
        })
    },

    //create seeker skill set
    addSeekerTags: (key, tags, tags_str) => {
        return redis.set(`seeker:tags:${key}`, tags_str).then(() => {
            return Promise.all(tags.map((tag) => {
                console.log(tag)
                knex.raw("INSERT INTO seeker_tags VALUES(null,?,?,?)",
                             [key, tag.tag, tag.tag_type]).then(null, console.log)
            }))
        })
    },

    //delete seeker tags
    delSeekerTags: (key) => {
        return redis.del(`seeker:tags:${key}`).then(() => {
            return knex.raw("DELETE FROM seeker_tags WHERE user_id = ? AND NOT(tag_type='level')",
            [key]).then(null,console.log)
        })
    },

    //edit company profile
    editCompanyProfile: (key, data) => {
        return knex.raw("UPDATE recruiters SET company_name = ?, contact_no = ? WHERE user_id = ?", 
        [data.name, data.contact_no, key]).then(() => {
                        return redis.pipeline()
                                    .hmset(`employer:${key}`, {
                                            'company': data.name, 
                                            'contact_no': data.contact_no})
                                    .hmset(`company:${key}`, {
                                        'name': data.name,
                                        'contact_no': data.contact_no,
                                        'website': data.website,
                                        'description': data.description,
                                        'establishment_date': data.establishment_date,
                                        'location': data.location
                                    })
                                    .exec()
                    })
    },

    addCompanyPic: (key, url) => {
        return redis.hget(`company:${key}`, 'pic_url').then((url_old) => {
            return redis.hmset(`company:${key}`, {'pic_url': url, 'pic_url_old': url_old})
        })
    },

    //get company profile
    // getCompanyProfile: (data) => {
    //     return knex.select('company_profile.company_id',
    //                        'company_profile.name', 
    //                        'company_profile.website', 
    //                        'company_profile.description', 
    //                        'company_profile.establishment_date', 
    //                        'company_profile.location',
    //                        'recruiters.email',
    //                        'recruiters.contact_no')
    //                 .from('company_profile')
    //                 .join('recruiters', 'recruiters.user_id', '=', 'company_profile.company_id')
    //                 .where({'company_profile.company_id':data})
    // },

    //get all companies
    getAllCompanies: () => {
        return knex.select('*').from('company_profile')
    },

    //create job post
    createJobPost: (id, data) => {
        return knex.raw("INSERT INTO job_post VALUES(null,?,?,?,?,?,?)",
                        [data.job_name, data.company_name, id, "yes", data.date_posted, data.date_deadline])
                    .then((res) => {
                        const job_id = res[0].insertId
                        return Promise.all([
                                    knex.raw("INSERT INTO job_tags VALUES(null, ?,?,?,?)",
                                        [job_id, id, data.type, "type"]),
                                    knex.raw("INSERT INTO job_tags VALUES(null, ?,?,?,?)", [
                                        job_id, id, data.level, "level"])
                                    ]).then(() => {
                                        return redis.hmset(`job:${job_id}`, {
                                                        'job_id': job_id,
                                                        'job_name': data.job_name,
                                                        'company_name': data.company_name,
                                                        'type': data.type,
                                                        'level': data.level,
                                                        'posted_by_id': id,
                                                        'job_location': data.job_location,
                                                        'description': data.description,
                                                        'qualifications': data.qualifications,
                                                        'is_open': "yes",
                                                        'date_posted': data.date_posted,
                                                        'date_deadline': data.date_deadline
                                                    })
                                    }).then(() => {return Promise.resolve(job_id)})
                    })
    },

    //edit job post
    editJobPost: (jobId, data) => {
        return knex.raw("UPDATE job_post SET job_name = ?, is_open = ?, date_deadline = ? WHERE job_id = ?", 
                        [data.job_name, data.is_open, data.date_deadline, jobId]).then(console.log, console.log)
                    .then(() => {
                        return Promise.all([
                                    knex.raw("UPDATE job_tags SET tag=? WHERE job_id = ? AND tag_type='type'",
                                        [data.type, jobId]),
                                    knex.raw("UPDATE job_tags SET tag=? WHERE job_id = ? AND tag_type='level'",
                                        [data.level, jobId])
                                    ])
                    }).then(() => {
                        return redis.hmset(`job:${jobId}`, {
                                        'job_name': data.job_name,
                                        'type': data.type,
                                        'level': data.level,
                                        'job_location': data.job_location,
                                        'description': data.description,
                                        'qualifications': data.qualifications,
                                        'is_open': "yes",
                                        'date_posted': data.date_posted,
                                        'date_deadline': data.date_deadline
                                    })
                    })
    },

    addJobTags: (jobId, userId, tags, tags_str) => {
        return redis.set(`job:tags:${jobId}`, tags_str).then(() => {
            return Promise.all(tags.map((tag) => {
                knex.raw("INSERT INTO job_tags VALUES(null, ?,?,?,?)",
                             [jobId, userId, tag.tag, tag.tag_type]).then(null, console.log)
            }))
        })
    },

    //delete seeker tags
    delJobTags: (jobId) => {
        return redis.del(`job:tags:${jobId}`).then(() => {
            return knex.raw("DELETE FROM job_tags WHERE job_id = ? AND NOT(tag_type = 'type' OR tag_type='level') " ,
            [jobId]).then(null,console.log)
        })
    },

    getJobTags: (jobId) => {
        // return knex.select('tag', 'tag_type')
        //             .from('job_tags')
        //             .whereRaw("job_id = ? AND NOT(tag_type='type' OR tag_type='level')", [jobId])
        return redis.get(`job:tags:${jobId}`)
    },

    //delete job post
    delJobPost: (jobId) => {
        return knex.raw("DELETE FROM job_post WHERE job_id = ?", [jobId]).then(null,console.log)
                    .then(() => {
                        redis.del(`job:${jobId}`)
                    })
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

    //get jobs by id redis
    getJobByIdRedis: (jobId) => {
        //  return knex.raw("SELECT * FROM job_post WHERE job_id = 1")
        return redis.hgetall(`job:${jobId}`)
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

    getSocketId: (userId) => {
        return redis.get(`employer:socketId:${userId}`)
    },

    incrementNotifCount: (userId) => {
        return redis.hget(`employer:${userId}`, 'app_notifications').then(res => {
            return redis.hset(`employer:${userId}`, 'app_notifications', +res + 1)
        })
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
        // console.log(order + how + offset + limit)
        return knex.select('*').from('job_post').orderBy(order, how).offset(offset).limit(limit)
    },

    getJobsPerPageEmployer: (order, how, offset, limit, id) => {
        // return knex.raw("SELECT * FROM jobs ORDER BY job_posted DESC LIMIT ?, ?", [start, end])
        // console.log(order + how + offset + limit)
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
    },

    getAllRedis: ()=> {
        return redis.keys('*')
    },

    getRedisKey: (key) => {
        return redis.scan(0, "match", 'seeker:'+key+'*').then((data) => {
            console.log(data)
            return redis.hgetall(data[1][0])
        })
    },

    getOptions: () => {
        return redis.pipeline()
                    .smembers("levels")
                    .smembers("types")
                    .smembers("skills")
                    .smembers("fields")
                    .smembers("educations")
                    .smembers("genders")
                    .exec()
    },

    postRedisOptions: (data) => {
        console.log(data.levels)
        return redis.pipeline()
                    .sadd("levels", data.levels)
                    .sadd("types", data.types)
                    .sadd("skills", data.skills)
                    .sadd("fields", data.fields)
                    .sadd("educations", data.educations)
                    .sadd("genders", data.genders)
                    .sadd("image_exts", data.image_exts)
                    .sadd("resume_exts", data.resume_exts)
                    .exec()
    },

    deleteNotifications: (role, userId) => {
        console.log(`${role}:${userId}`)
        return redis.hset(`${role}:${userId}`, 'app_notifications', 0)
    },

    getEmailValues: (seekerId, employerId, jobId) => {
        return redis.pipeline()
                    .hgetall(`seeker:${seekerId}`)
                    .hgetall(`employer:${employerId}`)
                    .hgetall(`job:${jobId}`)
                    .exec()
    },

    getEmailValuesResult: (seekerId, jobId) => {
        return redis.hget(`job:${jobId}`, 'posted_by_id').then((res) => {
            return redis.pipeline()
            .hgetall(`seeker:${seekerId}`)
            .hgetall(`employer:${res}`)
            .hgetall(`job:${jobId}`)
            .exec()
        })
    }
}