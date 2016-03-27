"use strict";

var Module = require('../lib/module.class.js');
var log = require('../util/logger');

const DESCDEFAULT = `Put the summary of the bug you're having here\r\n\r\n*What I expected to happen was...:*\r\nDescribe what you thought should happen here\r\n\r\n*What actually happened was...:*\r\nDescribe what happened here\r\n\r\n*Steps to Reproduce:*\r\n1. Put a step by step guide on how to trigger the bug here\r\n2. ...\r\n3. ...`;
const ENVDEFAULT = `Put your operating system (Windows 7, Windows XP, OSX) and Java version if you know it here`;
const MINLENGTH = 5;


module.exports = class ModuleEmpty extends Module {
    constructor({config}) {
        super({config});

    }

    check({issue}) {

        let signature = {
            issueKey: issue.key,
            priority: this.data.priority,
            resolve: {
                type: 'Awaiting Response',
                link: null,
                message: this.config.messages.closeReasonAwaiting
            }
        };

        let closeReasons = this.config.messages;

        return new Promise(function (resolve, reject) {
            let description = issue.fields.description;
            let environment = issue.fields.environment;
            let attachments = issue.fields.attachment;



            if (description === null || description.length < MINLENGTH || description == DESCDEFAULT) {

                if (attachments.length > 0) return resolve(null); // It means we have data to work with.

                else if (environment !== ENVDEFAULT && environment.length > 10) {
                    log.trace(`[Empty] ${issue.key} - Incomplete issue with source launcher found.`);
                    return resolve(signature);

                } else {
                    log.trace(`[Empty] ${issue.key} - Empty or default description found.`);

                    signature.resolve.type = 'Incomplete';
                    signature.resolve.message = closeReasons.closeReasonIncomplete;
                    resolve(signature);
                }
            }
        });

    }
};