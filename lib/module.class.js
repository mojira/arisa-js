"use strict";

var log = require('../util/logger');

/** Module class, to be extended from **/

module.exports = class Check {
    constructor({config}) {
        this.name = config.module.name;
        this.active = true;

        this.data = config.module;
        this.config = config.config;

        log.trace(`Module loaded: ${this.name}`);
    }

    // Activate the checks.
    static activate() {
        if (this.active) log.error(`[${this.name}] Check already active.`);
        else{
            this.active = true;
            log.info(`${this.name} | Check activated.`)
        }

    }

    // Deactivate the checks.
    static deactivate() {
        if (!this.active) log.error(`[${this.name}] Check already inactive.`);
        else{
            this.active = false;
            log.info(`${this.name} | Check deactivated.`)
        }

    }

    // Start running. Should be overridden. Does nothing by itself.
    static check({issue}) {
        if (this.active) log.warn(`[${this.name}] Check active but nothing to do.`);
        else log.warn(`${this.name} | Check not active.`)
    }
};