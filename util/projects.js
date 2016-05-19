"use strict";

var async = require('async');
var fs = require('fs');

const Project = require('../lib/project.class.js');

var concurrentChecks = 3;

var log = require('./logger');

/*Project related stuff*/

// Fetch available projects and put them in the projects var
exports.initProjects = function ({jira, config}) {
    let configCore = config.core;

    // Get all projects, make Project instances out of them and resolve when done.
    return new Promise(function (resolve, reject) {

        let projects = {};
        let projectWhitelist = configCore.project_whitelist;

        jira.project.getAllProjects(null, function (error, data) {
            if (error) return reject(error);
            else {
                // Initialize project values
                // Creates Projects of each project, each holding data and useful functions. See project.class.js
                for (let project of data) {
                    if (project.hasOwnProperty('key') && projectWhitelist.indexOf(project.key) >= 0) {
                        projects[project.key] = new Project({project, jira});
                    }
                }
                log.info(`Project processing complete. Found ${Object.keys(projects).length} projects.`);
                log.info(`Whitelisted these projects: [${projectWhitelist}].`);

                return resolve(projects);
            }
        });
    })
};

/**
 * Renew versions of each project
 * @param projects {object} -
 * @param jira
 * @returns {Promise}
 */
exports.renewVersions = function (projects, jira) {

    return new Promise((resolve, reject) => {

        async.forEachOfLimit(projects, 3, (project, key, callback) => {


            jira.project.getVersions({projectIdOrKey: key}, function (error, data) {
                if (error) log.error(error);
                else {
                    let latest = {id: 0};   // Initialize the 'latest' object. Will be actively worked with until the last version has been checked.


                    for (let i = 0; i < data.length; i++) {
                        let entry = data[i];
                        if (!entry.archived && entry.released && entry.id > latest.id) latest = entry;
                    }

                    projects[project.key].latestVersion = latest;
                    log.trace(`Renewed ${project.key} - ${(latest.name !== undefined)? latest.name : 'N/A'}`);
                }

                callback();


            });
        }, function (error) {
            if (error) log.error(error);
            else {
                log.info('Done renewing versions');
                resolve();
            }
        });
    })
};

exports.renewSecurity = function ({projects, jira}) {
    return new Promise((resolve, reject) => {

        let projectArr = [];

        for (let project in projects) {
            projectArr.push(project)
        }

        jira.issue.getCreateMetadata({
            projectKeys: projectArr.toString(),
            expand: 'projects.issuetypes.fields'
        }, (error, data) => {

            for (let dataProject of data.projects) {

                if (dataProject.issuetypes[0].fields.security) {
                    for (let level of dataProject.issuetypes[0].fields.security.allowedValues) {

                        if (level.name.match(/public/i)) projects[dataProject.key].security.public = level;
                        else if (level.name.match(/private/i)) projects[dataProject.key].security.private = level;
                    }
                }
            }

            resolve();
        });


    })
};