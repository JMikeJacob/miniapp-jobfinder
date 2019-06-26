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
    }
}