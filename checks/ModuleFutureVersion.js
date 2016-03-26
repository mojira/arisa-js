"use strict";

var Module = require('../lib/module.class.js');
var log = require('../util/logger');


module.exports = class ModuleFutureVersion extends Module {
    constructor({config, projects}) {
        super({config});
    }

    check({issue, projects}) {
        let doComment = false;
        let comment = this.config.messages.updateReason;

        return new Promise(function (resolve, reject) {
            if (projects[getProject(issue.key)].latestVersion) {

                let latest = projects[getProject(issue.key)].latestVersion;
                let affected = issue.fields.versions; //Array of objects

                if (affected.length > 0) {
                    for (var i = 0; i < affected.length; i++) {
                        if (!affected[i].released && latest.id != 0) {
                            doComment = true;
                            issue.replaceAffected(affected[i].name, latest.name);
                        }
                    }

                    if (doComment) issue.comment({comment});

                }

                resolve(null);
            } else resolve(null);


        });

    }
};

function getProject(key) {
    return key.replace(/[^A-Z].*/i, '');
}