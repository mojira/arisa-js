"use strict";

var log = require('../util/logger');

/***
 * Issue class
 */

var transition = {
    transition: {id: 5}
};

module.exports = class Issue {
    constructor({key, id, fields, transitions, project, jira}) {

        this.jira = jira;

        this.key = key;
        this.id = id;
        this.fields = fields;
        this.transitions = transitions;
        this.project = project;
        this.resolved = false;
    }

    /**
     * Resolve an issue
     * @param comment - Reason why it's closed
     * @param resolution - Resolution type
     */
    resolve({comment, resolution}) {
        let transition = {
            issueKey: this.key,
            transition: {
                transition: {id: 5},
                fields: {resolution: {name: resolution}},
                update: {comment: [{add: {body: comment}}]}
            }
        };

        if (this.resolved) {
            log.trace(`${this.key}: Issue already resolved. Skipping`);
            return;
        }


        this.jira.issue.transitionIssue(transition, function (error, response) {
            if (error) log.info(`${this.key}: Could not resolve. Was it resolved already? (${error.message})`);
            else {
                log.trace(`${this.key}: Issue resolved successfully!`);
                this.resolved = true;
            }
        }.bind(this))
    }

    /**
     * Reopen an issue
     * No parameters required
     */
    reopen() {
        let transitionData = {
            issueKey: this.key,
            transition: {id: '3'}
        };

        this.jira.issue.transitionIssue(transitionData, function (error, response) {
            if (error) log.trace(`${this.key}: Could not reopen. Is it open still?`);
            else log.trace(`${this.key}: Issue reopened successfully!`);
        }.bind(this))
    }

    /**
     * Link 2 issues together.
     * @param destination - Issue to link the current issue to
     */
    link({destination}) {
        let linkData = {
            issueLink: {
                type: {name: 'Duplicate'},
                inwardIssue: {key: this.key},
                outwardIssue: {key: destination}
            }
        };

        this.jira.issueLink.createIssueLink(linkData, (error, data) => {
            (error) ? log.error(error) : log.trace('Link successful')
        });
    }

    /**
     * Comment on an issue
     * @param comment - Comment body, string
     * @param hidden - If the comment should be hidden to moderators
     */
    comment({comment, hidden = false}) {
        let visibility = {
            type: 'group',
            value: 'global-moderators'
        };

        if (!hidden) visibility = null;

        let commentData = {
            issueKey: this.key,
            comment: {
                body: comment,
                visibility: visibility
            }

        };

        this.jira.issue.addComment(commentData, (error, data) => {
            (error) ? log.error(error) : log.info(`${issue.key} Added a comment`);
        });

    }


    deleteAttachment(attachment) {
        this.jira.attachment.deleteAttachment({attachmentId: attachment.id}, (error, data) => {
            (error) ? log.error(error) : log.info(`[${this.key}] Removed attachment ("${attachment.filename}" by "${attachment.author.name}"`);
        })
    }

    replaceAffected(oldVersion, newVersion, comment) {
        let key = this.key;

        this.jira.issue.editIssue({
            issueKey: this.key,
            issue: {
                update: {
                    versions: [
                        {remove: {name: oldVersion}},
                        {add: {name: newVersion}}
                    ]
                }
            }
        }, (error, data) => {
            if (error) log.error(error);
            else log.info(`[${this.key}] Replaced future version. (${oldVersion} => ${newVersion})`);
        })
    }


    updateCHK(timestamp) {

        let opts = {
            issueKey: this.key,
            transition: {
                transition: {
                    id: transition
                },
                fields: {
                    'customfield_10701': timestamp
                }
            }
        };

        for (let i = 0; i < this.transitions.length; i++) {
            if (this.transitions[i].name == 'Update Issue') opts.transition.transition.id = this.transitions[i].id;
        }

        this.jira.issue.transitionIssue(opts, (error, data) => {
            if (error) log.error(error);
            else log.trace(`[${this.key}] - Added CHK`);
        });
    }

    addSecurityLevel(level) {

        this.jira.issue.editIssue({
            issueKey: this.key,
            issue: {
                update: {
                    security: [
                        {set: {id: level.id}}
                    ]
                }
            }
        }, (error, data) => {
            if (error) log.error(error);
            else log.info(`[${this.key}] Added security level. (${level.name})`);
        })

    }
};