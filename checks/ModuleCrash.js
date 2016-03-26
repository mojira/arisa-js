"use strict";

var Module = require('../lib/module.class.js');
var moment = require('moment');
var request = require('request');
var log = require('../util/logger');
var async = require('async');

const CRASHGAME = /---- Minecraft Crash Report ----/i;
const CRASHJAVAHEAD = /#  EXCEPTION_ACCESS_VIOLATION/i;


module.exports = class ModuleCrash extends Module {
    constructor({config, mainconfig}) {
        super({config});

        this.mainconfig = mainconfig;
    }


    check({issue}) {

        return new Promise((resolve, reject) => {
            let key = issue.key;

            this.fetchIssues(issue)
                .then((data) => this.parseIssues(key, data))
                .then((data) => this.checkDuplicates(key, data))
                .then((data) => this.compareIssues(key, data))
                .then((data) => this.getSignature(key, data))
                .then(resolve)
                .catch(error => {
                    log.error(`${issue.key} - ${error}`);
                    resolve(null);
                });

        });
    }


    fetchIssues(issue) {
        let arrIssues = [];
        let auth = {auth: {user: this.mainconfig.jira.basic_auth.username, pass: this.mainconfig.jira.basic_auth.password}};
        let cutoff = moment().subtract(30, 'day');

        return new Promise((resolve, reject) => {
            //Add Description
            arrIssues.push({
                content: issue.fields.description,
                timestamp: issue.fields.created
            });

            // Add attachments
            async.forEachOf(issue.fields.attachment, (attachment, key, callback) => {
                if (attachment.filename.match(/\.txt|\.log/) && cutoff.isBefore(attachment.created)) {

                    request(attachment.content, auth, (error, response, body) => {

                        if (!error || response.statusCode === 200) {
                            arrIssues.push({content: body, timestamp: attachment.created});
                            callback();

                        } else callback();
                    })


                } else callback();
            }, error => {
                if (error) log.error(error);
                resolve(arrIssues);
            });
        });

    }

    parseIssues(key1, data) {
        let parsedCrashes = [];

        return new Promise((resolve, reject) => {

            async.forEachOf(data, (issue, key, callback) => {

                let crashInfo = {
                    type: null,
                    head: null,
                    version: null,
                    java: null,
                    duplicates: null,
                    modded: false,
                    created: null
                };

                crashInfo.created = issue.timestamp;

                let resultGame = issue.content.match(CRASHGAME);
                let resultJava = issue.content.match(CRASHJAVAHEAD);

                if (resultGame) {
                    let crashlog = issue.content.substr(resultGame.index).split('\n');

                    crashInfo.head = crashlog[6].replace('\r', '');
                    crashInfo.type = 'game';

                    for (let line of crashlog) {
                        if (line.match(/Minecraft version/i)) crashInfo.version = line.replace('\tMinecraft Version: ', '').replace('\r', '');
                        if (line.match(/Java version/i)) crashInfo.java = line.replace(/[^0-9\._]/g, '');
                        if (line.match(/Is modded/i)) crashInfo.modded = (line.match(/Probably not/)) ? false : true;
                    }

                    parsedCrashes.push(crashInfo);
                    callback();

                } else if (resultJava) {
                    let crashlog = issue.content.substr(resultJava.index).split('\n');

                    crashInfo.type = 'java';

                    for (let line of crashlog) {
                        if (line.match(/# C  /i)) crashInfo.head = line.substring(line.indexOf('[') + 1, line.indexOf('+'));
                    }

                    parsedCrashes.push(crashInfo);
                    callback();

                } else callback();


            }, error => {
                if (error) log.error(error);
                resolve(parsedCrashes);
            })


        })

    }

    checkDuplicates(key, data) {

        let parsedIssues = [];

        return new Promise((resolve, reject) => {
            async.forEachOf(data, (issue, key, callback) => {

                let crashInfo = this.config.crashinfo[issue.type];

                for (let info of crashInfo) {
                    if (issue.head.match(new RegExp(info.head))) {
                        issue.duplicates = info.duplicates;
                        break;
                    }
                }

                parsedIssues.push(issue);
                callback();

            }, (error) => {
                if (error) log.error(error);
                resolve(parsedIssues)
            })
        })


    }


    compareIssues(key, data) {
        let parentCrash = null;

        return new Promise((resolve, reject) => {

            for (let issue of data) {
                if (parentCrash == null && issue.head !== '') parentCrash = issue; // Should only happen once
                else {

                    // Compare dates
                    if (moment(issue.created).isAfter(moment(parentCrash.created))) {
                        // Issue is newer.
                        if (parentCrash.modded) parentCrash = issue;
                        else if (!parentCrash.modded && !issue.modded) parentCrash = issue;

                    } else {
                        // Issue is older, only replace if parent is modded and child is vanilla.
                        if (parentCrash.modded && !issue.modded) parentCrash = issue;
                    }

                }
            }

            resolve(parentCrash);
        })
    }

    getSignature(key, data) {
        let signature = {
            issueKey: key,
            priority: this.data.priority,
            resolve: {
                type: null,
                link: null,
                message: null
            }
        };

        if (!data || !data.duplicates) return null;
        else if (data.modded) {
            signature.resolve.type = 'Invalid';
            signature.resolve.message = this.config.messages.closeReasonMod;
            return signature

        } else {
            signature.resolve.type = 'Duplicate';
            signature.resolve.link = data.duplicates;
            signature.resolve.message = this.config.messages.closeReasonDupe.replace('{DUPLICATE}', data.duplicates);
            return signature
        }

    }
};
