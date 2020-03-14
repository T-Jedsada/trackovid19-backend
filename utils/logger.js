const { isObject, isNumber, isString } = require('lodash');
const winston = require('winston');

MAX_LOG_SIZE = process.env.MAX_LOG_SIZE;

const outputToConsole = process.env.LOGS_TO_CONSOLE || false;

function removeLastLineBreak(string) {
    return isString(string) ? string.replace(/\n$/, '') : '';
}

/**
 * Formats the log output, in order to include the timestamp, label, log level and the message. Also it's possible see
 * the duration when it's used the profiler.
 *
 * E.g:
 * 2018-02-24T20:20:20.202Z [label] level: message | durationMs ms
 *
 * @param {object} info
 * @returns {string}
 */
function formatLoggerOutput(info) {
    let { timestamp, label, level, message, durationMs } = info;

    // This verifies if the message is an object. Normally the message is an object
    // when the it's used the profile command.
    if (isObject(info.message)) {
        label = message.label;
        message = message.message;
    }

    return `${timestamp} [${label}] ${level}: ${removeLastLineBreak(message)} ${
        isNumber(durationMs) ? `| ${durationMs} ms`: ''}`
}

// Winston logger configuration
const logger = winston.createLogger({
    level: 'info',
    transports: [
        // Configures the log file
        new winston.transports.File({
            filename: process.env.LOGS_FILENAME,
            maxsize: MAX_LOG_SIZE,
            maxFiles: 1,
            tailable: true,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(formatLoggerOutput)
            )
        })
    ]
});

if(outputToConsole) {
    logger.add(
        // Configures the console logger
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp(),
                winston.format.printf(formatLoggerOutput)
            )
        }));
}

/**
 * The export returns a function which returns an object.
 * That object returns these methods:
 *  - info    - logs information messages
 *  - warn    - logs warning messages
 *  - error   - logs error messages
 *  - profile - logs profiling messages
 *  - restAPILogger - logs the user requests
 *
 *  Example of usage:
 *
 *  // logs: 2018-02-24T20:20:20.202Z [label-example] info: Hello world!
 *  logger('label-example').info('Hello world!');
 *
 * @param {string} label
 * @returns {object}
 */

module.exports = (label) => ({
    info: (msg) => logger.log({ label: label, level: 'info', message: msg }),
    warn: (msg) => logger.log({ label: label, level: 'warn', message: msg }),
    error: (msg) => logger.log({ label: label, level: 'error', message: msg }),
    profile: (msg) => logger.profile({ label: label, message: msg }),
    restAPILogger: { write: msg => logger.log({ label: label, level: 'info', message: msg }) }
});
