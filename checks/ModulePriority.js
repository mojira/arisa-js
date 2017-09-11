"use strict";

var Module = require('../lib/module.class.js');

module.exports = class ModulePriority extends Module {
    constructor({config}) {
        super({config});
    }

    check({issue}) {

        return new Promise(function (resolve, reject) {
            let priority = issue.fields.priority.name;

            if(priority == null && issue.key == "WEB") {
                issue.setPriority("Minor");
            }
            
            resolve(null);
        });
    }
};
