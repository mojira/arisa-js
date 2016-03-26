"use strict";

var Module = require('../lib/module.class.js');
var log = require('../util/logger');

const DESCDEFAULT = `Put the summary of the bug you're having here\r\n\r\n*What I expected to happen was...:*\r\nDescribe what you thought should happen here\r\n\r\n*What actually happened was...:*\r\nDescribe what happened here\r\n\r\n*Steps to Reproduce:*\r\n1. Put a step by step guide on how to trigger the bug here\r\n2. ...\r\n3. ...`;
const MINLENGTH = 5;


module.exports = class ModuleEmpty extends Module {
    constructor({ config }) {
        super({config});

    }

    check({ issue }){

        let signature = {
            issueKey: issue.key,
            priority: this.data.priority,
            resolve: {
                type: 'Invalid',
                link: null,
                message: this.config.messages.closeReason
            }
        };


        return new Promise(function(resolve, reject){
            let description = issue.fields.description;

            if(description === null || description.length < MINLENGTH || description == DESCDEFAULT){
                log.trace(`[Empty] ${issue.key} - Empty or default description found.`);
                resolve(signature);
            }else{
                resolve(null);
            }
        });

    }
};