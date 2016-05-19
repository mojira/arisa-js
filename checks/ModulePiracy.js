"use strict";

var Module = require('../lib/module.class.js');
var log = require('../util/logger');

const PIRACYSIGNATURES = ['Minecraft Launcher null', 'Bootstrap 0', 'Launcher: 1.0.10  (bootstrap 4)', 'Launcher: 1.0.10  (bootstrap 5)',
    'Launcher 2.0', 'Launcher 3.0.0', 'Launcher: 3.1.0', 'Launcher: 3.1.1', 'Launcher: 3.1.4', '1.0.8', 'uuid sessionId',
    'auth_access_token', 'windows-${arch}', 'keicraft', 'keinett', 'nodus', 'iridium', 'mcdonalds', 'uranium', 'nova',
    'divinity', 'gemini', 'mineshafter', 'Team-NeO', 'DarkLBP'];
const PIRACYREGEX = new RegExp(PIRACYSIGNATURES.join('|'), 'i');

module.exports = class ModulePiracy extends Module {
    constructor({config}) {
        super({config});
    }

    check({issue}) {
        let signature = {
            issueKey: issue.key,
            priority: this.data.priority,
            resolve: {
                type: 'Invalid',
                link: null,
                message: this.config.messages.closeReason
            }
        };

        return new Promise(function (resolve, reject) {

            let environment = issue.fields.environment;
            let match = PIRACYREGEX.exec(environment);

            if (match) {
                log.trace(`[Piracy] ${issue.key} - Pirated launcher found: ${match[0]}`);
                resolve(signature);
            } else {
                resolve(null);
            }
        });

    }
};