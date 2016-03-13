'use strict';

const logger = require('logger')();

module.exports = class {

    callMethod() {
        let result;

        if (typeof arguments[0] == 'object') {
            const methods = arguments[0];
            let promises  = [];
            let equals    = [];

            Object
                .keys(methods)
                .forEach((key, i) => {
                    const method  = methods[key];
                    const promise = this._callOneMethod(method.name, method.args);
                    equals[i]   = key;

                    promises.push(promise);
                });

            result = q
                .all(promises)
                .then((data) => {
                    let result = {};

                    data.forEach((item, i) => {
                        result[equals[i]] = item;
                    });

                    return result;
                })
                .fail(this._onPromiseFail);
        } else {
            const name = arguments[0];
            const args = arguments[1];

            result = this
                ._callOneMethod(name, args)
                .fail(this._onPromiseFail);
        }

        return result;
    }

    _onPromiseFail(err) {
        const message = (err.getMessage)
            ? err.getMessage()
            : (err.stack || err);

        logger.error(message);
    }

    _callOneMethod(name, args) {
        const methodTypeSep = ':';

        if (name.indexOf(methodTypeSep) === -1) {
            throw new Error('Gate method type not found. Method: "' + name + '"');
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
