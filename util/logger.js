// var winston = require('winston');
//
// var logger = new winston.Logger({
//     transports: [
//         new winston.transports.Console({
//             level: 'silly',
//             handleExceptions: false,
//             json: false,
//             colorize: true
//         })
//     ]
// });


var log4js = require('log4js');
var logger = log4js.getLogger('application');
log4js.configure('config/log4js.json');

module.exports = logger;