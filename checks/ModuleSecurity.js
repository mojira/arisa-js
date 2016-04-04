/**
 * This module fixes security levels if they are missing
 *
 * This file is part of ArisaJS
 */

"use strict";

var Module = require('../lib/module.class.js');
var log = require('../util/logger');


module.exports = class ModuleSecurity extends Module {
    constructor({config}) {
        super({config});
    }

    check({issue}) {

        return new Promise(function (resolve, reject) {
            let fields = issue.fields;

            if (fields.security === undefined && issue.project.security.length > 0) {

                issue.addSecurityLevel(issue.project.security.public);
                resolve(null);

            } else resolve(null);


        });
    }
};