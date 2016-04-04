"use strict";


module.exports = class Project {
    constructor({project: {key, id, name}, jira}) {
        this.jira = jira;

        // Project values
        this.name = name;
        this.key = key;
        this.id = id;
        this.security = {};

        this.latestVersion = null;
    }

    get lastRelease() {
        if (new Date > this.cache) console.log(`Cache TTL expired. Refreshing versions for project ${this.project}`);
        return this.latestVersion;
    }

    set lastRelease(version) {
        this.latestVersion = version;
        console.log(`[${this.key}] Set latest version to ${version}`);
    }


    toString() {
        return this.name;
    }
};