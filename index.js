'use strict';

const logger = require('logger')();
const q      = require('q');

module.exports = class {

    callMethod() {
        let result;

        if (typeof arguments[0] == 'object') {
            const methods = arguments[0];
            const names   = Object.keys(methods);

            const promises = names.reduce((result, key) => {
                const method  = (typeof methods[key] == 'function')
                    ? methods[key]()
                    : methods[key];

                const promise = this._callOneMethod(method.name, method.args);

                result.push(promise);

                return result;
            }, []);

            result = q
                .all(promises)
                .then((data) => {

                    return data.reduce((result, item, index) => {
                        result[names[index]] = item;

                        return result;
                    }, {});
                });
        } else {
            const name = arguments[0];
            const args = arguments[1];

            result = this._callOneMethod(name, args)
        }

        return result;
    }

    _callOneMethod(name, args) {
        const methodTypeSep = ':';

        if (name.indexOf(methodTypeSep) === -1) {
            throw new Error('Do not specify the type of the method. Method: "' + name + '"');
        }

        const method       = name.split(':');
        const methodType   = method[0];
        const methodParams = method[1].split('/');
        let result;

        args = args || {};

        switch (methodType) {
            case 'base': {
                const controller = methodParams[0];
                const action     = methodParams[1] || 'index';

                result = this._callController(controller, action, args);
                break;
            }
            default: {
                throw new Error('Gate method type "'
                    + methodType
                    + '" not found. Method: "' + name + '"'
                );
            }
        }

        return result;
    }

    _callController(controllerName, actionName, args) {
        const controllersPath = './controllers/' + controllerName;
        const Controller      = require(controllersPath);
        const controller      = new Controller();

        return controller[actionName + 'Action'](args);
    }
};
