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
        ]
    }
}