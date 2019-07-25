const AWS = require('aws-sdk')
// AWS.config.update({region: 'us-west-2'})
// const ses = new AWS.SES({ 
//     apiVersion: "2010-12-01", 
//     region: 'us-west-2'})
const pinpoint = new AWS.Pinpoint({
    apiVersion: "2016-12-01", 
    region: 'us-west-2'
})

module.exports = {
    validateEmail: (str) => {
        let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        return re.test(String(str).toLowerCase())
    },

    validateLength: (str) => {
        if(str.length > 320) return false
        return true
    },

    validateContact: (str) => {
        let re = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/
        return re.test(String(str).toLowerCase())
    },

    validateInt: (str) => {
        let re = /^[0-9]*$/
        return re.test(String(str).toLowerCase())
    },

    stringifyTags: (tags) => {
        let convert = "["
        for(let i  = 0; i < tags.length; i++) {
            convert += "{\"tag\":"
            convert += '"' + tags[i].tag + '"'
            convert += ", \"tag_type\":"
            convert += '"' + tags[i].tag_type + '"'
            convert += "}"
            if(i < tags.length - 1) {
                convert += ","
            }
        }
        convert += "]"

        return convert
    },

    extractJobIds: (rows) => {
        const filters = []
        for(let i = 0; i < rows.length; i++) {
            filters.push(rows[i].job_id)
        }
        return filters
    },

    sendAppAlertToEmployer: (data) => {
        // const sender = `${data.employer_name} (via JobSeeker) <companytest413@gmail.com>`
        const sender = `JobSeeker Alert <companytest413@gmail.com>`
        const subject = "Job Application Alert"
        const body_text = `Hello, ${data.employer_name} from ${data.company_name}!\n` +
                          `\tAn applicant applied for your job post.\n` +
                          `Name: ${data.first_name} ${data.last_name}\n` +
                          `Position: ${data.job_name}\n` +
                          `Date Applied: ${data.date_posted}\n`
        const body_html = `<html>
                            <head></head>
                            <body>
                            <h1>Job Application Alert</h1>
                            <p>Hello, <strong>${data.employer_name}</strong> from <strong>${data.company_name}</strong>!</p>
                            <p>An applicant applied for your job post.</p>
                            <ul style="list-style-type:none;">
                                <li>Name: ${data.first_name} ${data.last_name}</li>
                                <li>Position: ${data.job_name}</li>
                                <li>Date Applied: ${data.date_posted}</li>
                            </ul>
                            To view your applications, <a href="http://localhost:4200/employer/apps/1">click here</a>.
                            </body>
                            </html>`
        const charset = "UTF-8"
        // const params = {
        //     Source: sender,
        //     Destination: {
        //         ToAddresses: [
        //             data.email
        //         ]
        //     },
        //     Message: {
        //         Subject: {
        //             Data: subject,
        //             Charset: charset
        //         },
        //         Body: {
        //             Text: {
        //                 Data: body_text,
        //                 Charset: charset
        //             },
        //             Html: {
        //                 Data: body_html,
        //                 Charset: charset
        //             }
        //         }
        //     }
        // }
        const params = {
            ApplicationId: "b2e31fb108284fe787b290078549435d",
            MessageRequest: {
                Addresses: {
                    [data.to_address]: {
                        ChannelType: "EMAIL"
                    }
                },
                MessageConfiguration: {
                    EmailMessage: {
                        FromAddress: sender,
                        SimpleEmail: {
                            HtmlPart: {
                                Charset: charset,
                                Data: body_html
                            },
                            TextPart: {
                                Charset: charset,
                                Data: body_text
                            },
                            Subject: {
                                Charset: charset,
                                Data: subject
                            }
                        }
                    }
                }
            }
        }

        // ses.sendEmail(params, (err, data) => {
        //     if(err) {
        //         console.error(err)
        //     } else {
        //         console.log("Email sent! Message ID: " + data.MessageId)
        //     }
        // })
        pinpoint.sendMessages(params, (err, data) => {
            if(err) {
                console.error(err)
            } else {
                console.log(data.MessageResponse.Result)
            }
        })
    },

    sendAppAlertToSeeker: (data) => {
        const sender = `${data.employer_name} (via JobSeeker) <companytest413@gmail.com>`
        // const sender = `JobSeeker Alert <companytest413@gmail.com>`
        const subject = "Job Application Alert"
        const body_text = `Hello, ${data.first_name} ${data.last_name}!\n
                            You have successfully applied for the following position:\n
                                \tCompany Name: ${data.company_name}\n
                                \tPosition: ${data.job_name}\n
                                \tRecruiter: ${data.employer_name}\n
                                \tEmail Address: ${data.employer_email}\n
                                \tContact #: ${data.contact_no}\n
                                \tDate Applied: ${data.date_posted}\n`
        const body_html = `<html>
                            <head></head>
                            <body>
                            <h1>Job Application Alert</h1>
                            <p>Hello, <strong>${data.first_name} ${data.last_name}</strong>!</p>
                            <p>You have successfully applied for the following position:</p>
                            <ul style="list-style-type:none;">
                                <li>Company Name: ${data.company_name}</li>
                                <li>Position: ${data.job_name}</li>
                                <li>Recruiter: ${data.employer_name}</li>
                                <li>Email Address: ${data.employer_email}</li>
                                <li>Contact #: ${data.contact_no}</li>
                                <li>Date Applied: ${data.date_posted}</li>
                            </ul>
                            <p>To view your applications, <a href="http://localhost:4200/seeker/apps/1">click here</a>.</p>
                            </body>
                            </html>`
        const charset = "UTF-8"
        // const params = {
        //     Source: sender,
        //     Destination: {
        //         ToAddresses: [
        //             data.email
        //         ]
        //     },
        //     Message: {
        //         Subject: {
        //             Data: subject,
        //             Charset: charset
        //         },
        //         Body: {
        //             Text: {
        //                 Data: body_text,
        //                 Charset: charset
        //             },
        //             Html: {
        //                 Data: body_html,
        //                 Charset: charset
        //             }
        //         }
        //     }
        // }
        const params = {
            ApplicationId: "b2e31fb108284fe787b290078549435d",
            MessageRequest: {
                Addresses: {
                    [data.to_address]: {
                        ChannelType: "EMAIL"
                    }
                },
                MessageConfiguration: {
                    EmailMessage: {
                        FromAddress: sender,
                        SimpleEmail: {
                            HtmlPart: {
                                Charset: charset,
                                Data: body_html
                            },
                            TextPart: {
                                Charset: charset,
                                Data: body_text
                            },
                            Subject: {
                                Charset: charset,
                                Data: subject
                            }
                        }
                    }
                }
            }
        }

        // ses.sendEmail(params, (err, data) => {
        //     if(err) {
        //         console.error(err)
        //     } else {
        //         console.log("Email sent! Message ID: " + data.MessageId)
        //     }
        // })
        pinpoint.sendMessages(params, (err, data) => {
            if(err) {
                console.error(err)
            } else {
                console.log(data.MessageResponse.Result)
            }
        })
    },

    sendResultAlertToSeeker: (data) => {
        const sender = `${data.employer_name} (via JobSeeker) <companytest413@gmail.com>`
        // const sender = `JobSeeker Alert <companytest413@gmail.com>`
        const subject = "Job Application Alert"
        const body_text = `Hello, ${data.first_name} ${data.last_name}!\n
                            You have been ${data.result}ed for the following position:\n
                                \tCompany Name: ${data.company_name}\n
                                \tPosition: ${data.job_name}\n
                                \tRecruiter: ${data.employer_name}\n
                                \tEmail Address: ${data.employer_email}\n
                                \tContact #: ${data.contact_no}\n`
        const body_html = `<html>
                            <head></head>
                            <body>
                            <h1>Job Application Alert</h1>
                            <p>Hello, <strong>${data.first_name} ${data.last_name}</strong>!</p>
                            <p>You have been <strong>${data.result}</strong> for the following position:</p>
                            <ul style="list-style-type:none;">
                                <li>Company Name: ${data.company_name}</li>
                                <li>Position: ${data.job_name}</li>
                                <li>Recruiter: ${data.employer_name}</li>
                                <li>Email Address: ${data.employer_email}</li>
                                <li>Contact #: ${data.contact_no}</li>
                            </ul>
                            <p>To view your applications, <a href="http://localhost:4200/seeker/apps/1">click here</a>.</p>
                            </body>
                            </html>`
        const charset = "UTF-8"
        // const params = {
        //     Source: sender,
        //     Destination: {
        //         ToAddresses: [
        //             data.email
        //         ]
        //     },
        //     Message: {
        //         Subject: {
        //             Data: subject,
        //             Charset: charset
        //         },
        //         Body: {
        //             Text: {
        //                 Data: body_text,
        //                 Charset: charset
        //             },
        //             Html: {
        //                 Data: body_html,
        //                 Charset: charset
        //             }
        //         }
        //     }
        // }
        const params = {
            ApplicationId: "b2e31fb108284fe787b290078549435d",
            MessageRequest: {
                Addresses: {
                    [data.to_address]: {
                        ChannelType: "EMAIL"
                    }
                },
                MessageConfiguration: {
                    EmailMessage: {
                        FromAddress: sender,
                        SimpleEmail: {
                            HtmlPart: {
                                Charset: charset,
                                Data: body_html
                            },
                            TextPart: {
                                Charset: charset,
                                Data: body_text
                            },
                            Subject: {
                                Charset: charset,
                                Data: subject
                            }
                        }
                    }
                }
            }
        }

        // ses.sendEmail(params, (err, data) => {
        //     if(err) {
        //         console.error(err)
        //     } else {
        //         console.log("Email sent! Message ID: " + data.MessageId)
        //     }
        // })
        pinpoint.sendMessages(params, (err, data) => {
            if(err) {
                console.error(err)
            } else {
                console.log(data.MessageResponse.Result)
            }
        })
    },

    sorts: {
        "Sort: Alphabetical A to Z": {order:"job_name", how:"asc"}, 
        "Sort: Alphabetical Z to A": {order:"job_name", how:"desc"}, 
        "Sort: Latest to Oldest": {order:"date_posted", how:"desc"},
        "Sort: Oldest to Latest": {order: "date_posted", how:"asc"},
        "Sort: Nearest Deadline": {order: "date_deadline", how: "desc"},
        "Sort: Farthest Deadline": {order: "date_deadline", how: "asc"}
    },

    options: {
        levels: [
            'Internship / OJT',
            'Fresh Grad / Entry Level',
            'Associate / Supervisor',
            'Mid-Senior Level / Manager',
            'Director / Executive'
        ],
          
        types: [
            'Temporary',
            'Part-Time',
            'Full-Time',
            'Contract',
            'Freelance'
        ],
        
        skills: [
            'Java',
            'NodeJS',
            'HTML',
            'CSS',
            'C++',
            'Javascript',
            'Eating',
            'Drinking',
            'Cleaning',
            'Leadership',
            'Encoding',
            'Drawing',
            'Writing',
            'Speaks Japanese',
        ],

        fields: [
            'Automobile',
            'IT - Hardware',
            'IT - Software',
            'Domestic Service',
            'Business',
            'Law',
            'Marketing',
            'Education',
            'Aeronautics',
            'Agriculture',
            'Aquaculture',
            'Tourism',
            'Government'
        ],

        educations: [
            'Elementary',
            'High School',
            'Undergraduate',
            'Masteral',
            'Doctorate',
            'Vocational',
            'Self-Taught'
        ],

        genders: [
            'Male',
            'Female',
            'Other'
        ],

        image_exts: [
            'jpeg',
            'jpg',
            'png'
        ],

        resume_exts: [
            'pdf',
            'docx',
            'doc'
        ]
    }
}