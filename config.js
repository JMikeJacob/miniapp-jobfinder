exports = {
    //MYSQL DATABASE VARS
    DB_HOST: process.env.DB_HOST || "localhost",
    DB_PORT: process.env.DB_PORT || "3306",
    DB_USER: process.env.DB_USER || "root",
    DB_PASSWORD: process.env.DB_PASSWORD || "root",
    DB_DATABASE: process.env.DB_DATABASE || "jobfinder",

    //REDIS DATABASE VARS
    REDIS_HOST: process.env.DB_HOST || "localhost",
    DB_PORT: process.env.DB_PORT || "6379",

    //AWS ACCESS KEYS
    AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY || "AKIASBPVXNWFA4ZDA473",
    AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "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"
}