'use strict';

const Data = require('app-data');

module.exports = class {

    call(method, args) {
        const data = new Data();

        return data.callMethod(method, args);
    }
};
