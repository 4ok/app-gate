const logger = require('logger')();

module.exports = class {

    constructor() {
        this._resources = {};
    }

    callMethod() {
        this._methods = arguments[0];
        this._methodsData = {};

        const methodsAliasesLevels = this._getMethodsAliasesLevels();
        let result = Promise.resolve();

        methodsAliasesLevels.forEach(methodsAliases => {
            result = result
                .then(() => Promise.all(
                    this._callMethodsLevel(methodsAliases)
                ))
                .then(items => {
                    items.forEach((item, index) => {
                        const methodAlias = methodsAliases[index];

                        this._methodsData[methodAlias] = item;
                    })
                });
        });

        return result.then(() => this._methodsData);
    }

    _getMethodsAliasesLevels() {
        const methods = this._methods;
        const result = [];

        function setDepsLevels(methodAlias, index) {
            const method = methods[methodAlias];

            if (!method) {
                throw new Error(`Can't resolve "${methodAlias}" dependency`);
            }

            const depsMethodsAliases = [].concat(method.deps || []);

            if (!result[index]) {
                result[index] = [];
            }

            if (!result[index].includes(methodAlias)) {
                result[index].push(methodAlias);
            }

            if (depsMethodsAliases.length) {

                depsMethodsAliases.map(depsMethodAlias => {
                    setDepsLevels(depsMethodAlias, index + 1);
                });
            }
        }

        Object
            .keys(methods)
            .forEach((methodAlias, index) => {
                setDepsLevels(methodAlias, 0);
            });

        return result.reverse();
    }

    _callMethodsLevel(methodsAliases) {
        return methodsAliases.map(methodAlias => {
            const method = this._methods[methodAlias];
            const methodKey = method.key || methodAlias;
            const methodsData = this._methodsData;

            if (methodsData[methodKey]) {
                return methodsData[methodKey];
            }

            return this._callResourceMethod(methodAlias);
        });
    }

    _callResourceMethod(methodAlias) { // todo: methodAlias
        const method = this._methods[methodAlias];
        const resourceSep = ':'; // todo
        const rawName = method.name;
        let result;

        if (rawName.indexOf(resourceSep) === -1) {
            throw new Error(`Do not specify the type of the method. Method: "${rawName}"`);
        }

        const depsData = this._getMethodDepsData(method);

        if (typeof method.guard === 'function') {
            method.guard = method.guard(depsData);
        }

        if (method.guard === undefined || method.guard) {
            const rawNameParams = rawName.split(':');
            const resourceName = rawNameParams[0];
            const methodName = rawNameParams[1];

            this._saveResource(resourceName);
            method.args = this._getMethodArgs(method);
            result = this._resources[resourceName].call(methodName, method.args || {});

            this.addCallbackAfter(result, method);

            logger.info('Call:', methodAlias, JSON.stringify(method));
        } else {
            logger.info('Guard:', methodAlias, JSON.stringify(method)); // TODO
            result = Promise.resolve(); // TODO
        }

        return result;
    }

    _getMethodDepsData(method) {
        const deps = [].concat(method.deps || []);

        return deps.reduce((result, methodAlias) => {
            return Object.assign(result, {
                [methodAlias]: this._methodsData[methodAlias]
            });
        }, {});
    }

    _saveResource(resourceName) {

        if (!this._resources[resourceName]) {
            // eslint-disable-next-line global-require
            const Resource = require('./resources/' + resourceName);

            this._resources[resourceName] = new Resource();
        }
    }

    _getMethodArgs(method) {

        if (typeof method.args !== 'function') {
            return method.args;
        }
        const deps = [].concat(method.deps || []);
        const depsData = deps.reduce((result, methodAlias) => {
            return Object.assign(result, {
                [methodAlias]: this._methodsData[methodAlias]
            });
        }, {});

        return method.args(depsData);
    }

    addCallbackAfter(result, method) {
        const after = method.after;

        if (after) {
            result.then(data => {
                after.call(after, data);
            });
        }
    }
};
