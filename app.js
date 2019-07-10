const express = require('express');
const session = require('express-session')
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

var indexRouter = require('./routes/index');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const cors = require('cors')

const originsWhiteList = [
  'http://localhost:4200'
]

const corsOptions = {
  origin: (origin, callback) => {
    const isWhiteListed = originsWhiteList.indexOf(origin) !== -1
    callback(null, isWhiteListed)
  },
  credentials: true
}
// app.use(session({
//     secret: "CoE Was Here",
//     cookie: {
//         maxAge: new Date(2147483647000)
//     },
//     resave: false,
//     saveUninitialized: false
// }))
// app.use(cors(corsOptions))
app.use(cors({origin: [
    "http://localhost:4200"
  ], credentials: true}))
app.use('/', indexRouter);

module.exports = app;
