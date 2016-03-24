'use strict';

const Data = require('app-data');

module.exports = class {

    constructor() {
        this._data = new Data();
    }

    call(method, args) {
        return this._data.callMethod(method, args);
    }
};
