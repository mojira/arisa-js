/**
 * This module reopens issues that are resolved as "Awaiting Response"
 * It only reopens when the issue was edited, or a comment was made by its author
 *
 * This file is part of ArisaJS
 */

"use strict";

var Module = require('../lib/module.class.js');
var log = require('../util/logger');


module.exports = class ModuleReopenAwaiting extends Module {
    constructor({config}) {
        super({config});
    }

    check({issue}) {

        return new Promise(function (resolve, reject) {
            let fields = issue.fields;
            let updated = new Date(fields.updated);
            let created = new Date(fields.resolutiondate);
            let creator = fields.reporter.name;

            if (fields.resolution !== null && (fields.resolution.name == 'Awaiting Response') && (updated - created) > 2000) {

                if (fields.comment.total > 0) {
                    let lastComment = fields.comment.comments[fields.comment.total - 1];
                    let commentAuthor = lastComment.author.name;
                    let commentCreated = new Date(lastComment.created);
                    let commentUpdated = new Date(lastComment.updated);

                    if (updated - commentUpdated < 2000 && (commentUpdated - commentCreated) > 2000) return; // Comment update did the update > Ignore update
                    else if (updated - commentCreated < 2000 && commentAuthor == creator) issue.reopen();
                    else if (updated - commentCreated > 2000){
                        let updateByCommentUpdate = false;

                        for (comment of fields.comment.comments){
                            let commentUpdated2 = new Date(comment.updated);
                            if(updated - commentUpdated2 < 2000) updateByCommentUpdate = true;
                        }

                        if(!updateByCommentUpdate) issue.reopen();

                    }
                }
            }
            resolve(null);
        });
    }
};