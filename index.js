'use strict';

const logger = require('logger')();
const q      = require('q');
const Data   = require('app-data');

module.exports = class {

    callMethod() {
        let result;

        if (typeof arguments[0] == 'object') {
            const methods = arguments[0];
            const names   = Object.keys(methods);

            const promises = names.reduce((result, key) => {
                let method = methods[key];

                if (typeof method == 'function') {
                    method = method();
                }

                const promise = this._callOneMethod(method.name, method.args);

                return result.concat(promise);
            }, []);

            result = q
                .all(promises)
                .then(data => data.reduce((result, item, index) => {
                    result[names[index]] = item;

                    return result;
                }, {}));
        } else {
            const name = arguments[0];
            const args = arguments[1];

            result = this._callOneMethod(name, args)
        }

        return result;
    }

    _callOneMethod(name, args) {
        const resourceSep = ':';

        if (name.indexOf(resourceSep) === -1) {
            throw new Error('Do not specify the type of the method. Method: "' + name + '"');
        }

        const nameParams   = name.split(':');
        const resourceName = nameParams[0];
        const method       = nameParams[1];

        const Resource = require('./resources/' + resourceName);
        const resource = new Resource();

        return resource.call(method, args || {});
    }
};
