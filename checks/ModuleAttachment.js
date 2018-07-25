"use strict";

var Module = require('../lib/module.class.js');
var log = require('../util/logger');

const INVALIDATTACHMENTS = ['\\.jar', '\\.exe', '\\.com', '\\.bat', '\\.msi', '\\.run', '\\.com', '\\.lnk', '\\.dmg', 'MST\\.rar', 'MST\\.zip'];
const INVALIDREGEX = new RegExp(INVALIDATTACHMENTS.join('|'), 'i');


module.exports = class ModuleAttachment extends Module {
    constructor({config}) {
        super({config});

    }

    check({issue}) {
        // Module does not report back but promise still needs to be resolved.

        let attachments = issue.fields.attachment;

        return new Promise(function (resolve, reject) {
            let totalRemoved = 0;

            if (attachments !== undefined && attachments.length > 0) {
                for (let i = 0; i < attachments.length; i++) {
                    if (INVALIDREGEX.test(attachments[i].filename)) {
                        totalRemoved++;
                        issue.deleteAttachment(attachments[i]);
                    }
                }
            }
            return resolve(null)
        });

    }
};
