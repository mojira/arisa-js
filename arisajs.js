"use strict";

var Issue = require('./lib/issue.class.js');  // Issue class
var Project = require('./lib/project.class.js');  // Project class
var Check = require('./lib/module.class.js');  // Check class
let Processor = require('./lib/processor.class.js');
let moment = require('moment');

var log = require('./util/logger.js');
var JiraApi = require('jira-connector');
var async = require('async');
var fs = require('fs');


/** Import libraries **/
let project = require('./util/projects.js');
let modules = require('./util/modules.js');

let config = null;
let jira = null;

var projects = {};
var tester = require('./checks/ModuleEmpty.js');

let processor;

let mainTimer;
let issueTimer;
let parsedIssueDate;


// Initialize Configuration
function initializeConfig() {
    return new Promise((resolve, reject) => {
        fs.access('./config/arisa.json', fs.R_OK, (err) => {
            if (err) reject(`Can't access config/arisa.json. (${err.message}`);
            else {

                config = require('./config/arisa.json');

                // Check jira authentication configuration. Actual login is done at a later stage.
                if (!config.jira || !config.jira.host) reject(`'jira' block missing or lacking host.`);
                if (!config.jira.basic_auth || !config.jira.basic_auth.username || !config.jira.basic_auth.password) reject(`'jira' block lacking auth info.`);

                // Check core-specific settings
                if (!config.core) reject(`'core' block missing`);
                if (!config.core.update_interval_sec || typeof config.core.update_interval_sec != 'number') reject(`'update_interval_sec' value missing or not a number`);
                if (!config.core.check_interval_sec || typeof config.core.check_interval_sec != 'number') reject(`'check_interval_sec' value missing or not a number`);
                if (!config.core.startup_offset_sec || typeof config.core.startup_offset_sec != 'number') reject(`'startup_offset_sec' value missing or not a number`);
                if (!config.core.project_whitelist || !Array.isArray(config.core.project_whitelist)) reject(`'project_whitelist' value missing or not an array`);
                if (config.core.project_whitelist.length == 0) reject(`'project_whitelist' array is empty. Add at least one project`);

                // Check processor-specific settings
                if (!config.processor) reject(`'processor' block missing`);
                if (!config.processor.bot_signature) reject(`'bot_signature' value missing`);

                // Set defaults
                jira = new JiraApi(config.jira);
                parsedIssueDate = moment().subtract(config.core.startup_offset_sec, 'seconds');

                resolve();

            }
        })
    })


}

// Initializing the script
function initialize() {
    
    function handleProjects(data) {
        return new Promise((resolve, reject) => {
            if (data !== null || data !== undefined) return resolve(data);
            else return reject('No projects were returned.')
        })
    }


    project.initProjects({jira, config})
        .then(handleProjects)   // Initiate whitelisted projects
        .then((data) => projects = data)    // Store projects locally
        .then((projects) => project.renewSecurity({projects, jira}))    // Get project security levels if applicable
        .then(() => processor = new Processor({projects, jira, config}))    // Intiate the processor
        .then(() => log.info('Processor created'))
        .then(() => processor.loadModules())    // Load all modules
        .then(() => log.info('Modules loaded'))
        .then(mainLoop) // Start issue checking
        .catch(msg => console.error('rejected: ' + msg));   // Catch any errors
}

/*Program loop, switches between issueloop and version checking*/
function mainLoop() {

    clearTimeout(issueTimer);
    project.renewVersions(projects, jira)
        // .then(() => project.renewSecurityLevels(projects, jira))
        .then(function () {
            setTimeout(mainLoop, config.core.update_interval_sec * 1000);
            issueLoop();
        }).catch(error => console.error(error));

}

/*Issue loop. Continually check for issues*/
function issueLoop() {
    queueIssues();
}


/*Fetch issues, populate a queue*/
function queueIssues() {
    let projectstring = config.core.project_whitelist.join(',');

    let opts = {
        jql: `project in (${projectstring}) AND resolution in (Unresolved, "Awaiting Response") AND updated >= -5m`,
        fields: ['resolution', 'description', 'labels', 'assignee', 'environment', 'attachment', 'versions', 'updated', 'created', 'resolutiondate', 'resolution', 'comment', 'reporter', 'customfield_10701', 'customfield_10500', 'security'],
        expand: ['transitions'],
        startAt: 0,
        maxResults: 50
    };

    let tmpUpdateDate = parsedIssueDate;

    jira.search.search(opts, function (err, data) {
        if (!data) {
            log.warn('Connection error, skipping.');
            issueTimer = setTimeout(issueLoop, config.core.check_interval_sec * 1000);
        } else {
            if (data.total === 0) {
                issueTimer = setTimeout(issueLoop, config.core.check_interval_sec * 1000);
            } else {
                log.trace(`Found ${data.total} issue(s)`);

                async.each(data.issues, function (issue, callback) {
                    let issueUpdateDate = (new Date(issue.fields.updated));

                    if (issueUpdateDate > parsedIssueDate) {
                        processor.addItem(new Issue({
                            key: issue.key,
                            id: issue.id,
                            fields: issue.fields,
                            transitions: issue.transitions,
                            project: projects[issue.key.replace(/[^A-Z].*/, '')],
                            jira
                        }));

                        if (issueUpdateDate > tmpUpdateDate) {
                            tmpUpdateDate = issueUpdateDate;
                        }

                    } else log.debug('Already parsed ' + issue.key);
                    callback()

                }, function (error) {
                    if (error) {
                        log.error('Error: ' + error)
                    }
                    else parsedIssueDate = tmpUpdateDate;
                });

                issueTimer = setTimeout(issueLoop, config.core.check_interval_sec * 1000);
            }
        }

    });


}


/* Module related stuff */

initializeConfig()
    .then(initialize)
    .catch((error) => log.error(`Error initializing configuration: ${error}`));