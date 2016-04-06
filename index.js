'use strict';

const q = require('q');

module.exports = class {

    constructor() {
        this._resources = {};
    }

    callMethod() {
        let result;

        if (typeof arguments[0] === 'object') {
            const methods = arguments[0];
            const names = Object.keys(methods);

            const promises = names.reduce((prev, key) => {
                let method = methods[key];

                if (typeof method === 'function') {
                    method = method();
                }

                const promise = this._callResourceMethod(method.name, method.args);

                return prev.concat(promise);
            }, []);

            result = q
                .all(promises)
                .then(data => data.reduce((prev, item, index) => {
                    prev[names[index]] = item;

                    return prev;
                }, {}));
        } else {
            const name = arguments[0];
            const args = arguments[1];

            result = this._callResourceMethod(name, args);
        }

        return result;
    }

    _callResourceMethod(name, args) {
        const resourceSep = ':';

        if (name.indexOf(resourceSep) === -1) {
            throw new Error('Do not specify the type of the method. Method: "' + name + '"');
        }

        const nameParams = name.split(':');
        const resourceName = nameParams[0];
        const method = nameParams[1];

        if (!this._resources[resourceName]) {
            const Resource = require('./resources/' + resourceName);

            this._resources[resourceName] = new Resource();
        }

        return this._resources[resourceName].call(method, args || {});
    }
};
