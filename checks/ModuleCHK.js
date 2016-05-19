"use strict";

var Module = require('../lib/module.class.js');
var moment = require('moment');
var log = require('../util/logger');

const CHKFIELD = 'customfield_10701';
const CONFIRMATIONFIELD = 'customfield_10500';


module.exports = class ModuleCHK extends Module {
    constructor({config}) {
        super({config});

    }

    check({issue}) {

        return new Promise(function (resolve, reject) {

            if (issue.fields[CONFIRMATIONFIELD] !== undefined && issue.fields[CONFIRMATIONFIELD].value != 'Unconfirmed' && issue.fields[CHKFIELD] == null) {
                issue.updateCHK(moment().format('YYYY-MM-DD[T]HH:mm:ss.SSSZZ'));
                resolve(null);
            }else resolve(null);

        });

    }
};