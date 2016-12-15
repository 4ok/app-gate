module.exports = class {

    constructor() {
        this._resources = {};
    }

    callMethod() {
        let result;

        if (typeof arguments[0] === 'object') {
            const methods = arguments[0];
            const aliases = Object.keys(methods);

            const promises = aliases.reduce((result, alias) => {
                const method = methods[alias];
                const promise = this._callResourceMethod(method);

                return result.concat(promise);
            }, []);

            result = Promise
                .all(promises)
                .then(data => data.reduce((result, item, index) => {
                    result[aliases[index]] = item;

                    return result;
                }, {}));
        } else {
            const [name, args] = arguments; // TODO: guard

            result = this._callResourceMethod({
                name,
                args
            });
        }

        return result;
    }

    _callResourceMethod(method) {
        const resourceSep = ':';
        const rawName = method.name;
        let result;

        if (rawName.indexOf(resourceSep) === -1) {
            throw new Error(`Do not specify the type of the method. Method: "${rawName}"`);
        }

        if (method.guard === undefined || method.guard) {
            const rawNameParams = rawName.split(':');
            const resourceName = rawNameParams[0];
            const methodName = rawNameParams[1];

            if (!this._resources[resourceName]) {
                // eslint-disable-next-line global-require
                const Resource = require('./resources/' + resourceName);

                this._resources[resourceName] = new Resource();
            }

            result = this._resources[resourceName].call(methodName, method.args || {});
        } else {
            console.info(`Guard: the method "${rawName}" didn't call`, method); // TODO
            result = Promise.resolve(); // TODO
        }

        return result;
    }
};
