"use strict";

var async = require('async');
var fs = require('fs');
var Module = require('./module.class.js');
var concurrentChecks = 3;

var log = require('../util/logger');
var botSignature;

module.exports = class Processor {
    constructor({projects, jira, config}) {
        this.projects = projects;
        this.jira = jira;
        this.config = config;

        this.modules = [];  // Check modules
        this.queue = async.queue(this.processItem.bind(this), concurrentChecks);
    }

    /* Pause the queue */
    pause() {
        log.log('Pausing processing...');
        this.queue.pause();
    }

    /* Resume the queue */
    resume() {
        log.log('Resumed processing.');
        this.queue.resume();
    }

    /* Add an item to the queue */
    addItem(item) {
        this.queue.push(item);
    }

    /* Load all modules */
    loadModules() {

        return new Promise((resolve, reject) => {

            let files = fs.readdirSync('./checks');
            let modulePromises = [];

            if (files.length === 0) {
                this.resume();
            } else {
                async.each(files, function (file, callback) {
                    modulePromises.push(loadModule(file, this.config).then(module => (module !== null) ? this.modules.push(module) : ''));
                    callback();

                }.bind(this), error => {
                    if (!error) Promise.all(modulePromises).then(resolve, error => log.error(`${error} - Skipping.`));
                })

            }
        })
    }

    processItem(task, callback) {

        let promises = [];
        let projects = this.projects;
        let signature = this.config.processor.bot_signature;

        let isNew = (task.fields.created == task.fields.updated);

        async.each(this.modules, function (item, callback) {

            if ((item.config.run.new && isNew) || (item.config.run.update && !isNew)) {
                promises.push(item.check({issue: task, projects}));
            }


            callback();

        }, function (error) {
            if (error) log.error(error);
            Promise.all(promises).then(values => handleIssue(task, values)).catch(error => log.error(error));
            callback();
        });

        function handleIssue(task, values) {
            values = values.filter((n) => {return n != undefined});
            if (values.length === 0) log.debug(`[${task.key}] No problems found`);
            else{
                let resolution = null;

                for(let res of values){
                    if(resolution == null || res.priority > resolution.priority) resolution = res;
                }

                resolution.resolve.message += signature;
                log.debug(resolution);


                task.resolve({comment: resolution.resolve.message, resolution: resolution.resolve.type});
                if(resolution.resolve.link) task.link({destination: resolution.resolve.link});



            }
        }

    }

};

function loadModule(file, mainconfig) {
    return new Promise(function (resolve, reject) {
        let stem = file.replace(/\..+$/, '');
        let configLocation = `./config/modules/${stem}.json`;

        if (!fs.existsSync(configLocation)) {
            log.error(`No config found at ${configLocation}.`);
            return resolve();
        }

        let config = require('.' + configLocation);

        if (config.module.name === undefined) {
            log.error(`Module '${file}' | Settings error: No name defined`);
            return resolve();
        }

        if (config.module.description === undefined) {
            config.module.description = 'No description given';
            log.warn(`Module '${file}' | Settings warning: No description defined, used default description.`);
        }

        if (config.module.priority === undefined) {
            config.module.priority = 0;
            log.warn(`Module '${file}' | Settings warning: No priority defined, defaulted to 0.`);
        }

        let Module = require('../checks/' + file);
        let module = new Module({config, mainconfig});

        if (Object.getOwnPropertyDescriptor(Module, 'prototype').writable) {
            log.error(`Module '${file}' | Module is invalid. Identified it as a function, not a class`);
            return resolve();
        }

        return resolve(module);

    });

}