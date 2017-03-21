module.exports = class {

    constructor() {
        this._resources = {};
    }

    callMethod() {
        const methods = arguments[0];
        const methodsAliasesLevels = this._getMethodsAliasesLevels(methods);
        const methodsData = {};
        let result = Promise.resolve();

        methodsAliasesLevels.forEach(methodsAliases => {
            result = result
                .then(() => Promise.all(
                    this._callMethodsLevel(methodsAliases, methods, methodsData)
                ))
                .then(items => {
                    items.forEach((item, index) => {
                        methodsData[methodsAliases[index]] = item;
                    })
                });
        });

        return result.then(() => methodsData);
    }

    _getMethodsAliasesLevels(methods) {
        const methodsAliases = Object.keys(methods);
        const result = [];

        function setDepsLevels(methodAlias, index) {
            const method = methods[methodAlias];
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

    _callMethodsLevel(methodsAliases, methods, methodsData) {
        return methodsAliases.map(methodAlias => {
            const method = methods[methodAlias];

            if (methodsData[methodAlias]) {console.log('@' + methodAlias + '@')
                return methodsData[methodAlias];
            }

            return this._callResourceMethod(method, methodsData);
        });
    }

    _callResourceMethod(method, methodsData) {
        const resourceSep = ':'; // todo
        const rawName = method.name;
        let result;

        if (rawName.indexOf(resourceSep) === -1) {
            throw new Error(`Do not specify the type of the method. Method: "${rawName}"`);
        }

        const depsData = this._getMethodDepsData(method, methodsData);

        if (typeof method.guard === 'function') {
            method.guard = method.guard(depsData);
        }

        if (method.guard === undefined || method.guard) {
            const rawNameParams = rawName.split(':');
            const resourceName = rawNameParams[0];
            const methodName = rawNameParams[1];

            this._saveResource(resourceName);
            method.args = this._getMethodArgs(method, methodsData);
            result = this._resources[resourceName].call(methodName, method.args || {});

            this.addCallbackAfter(result, method);

            console.info(`Call the method`, JSON.stringify(method)); // TODO
        } else {
            console.info(`Guard: the method did't call`, JSON.stringify(method)); // TODO
            result = Promise.resolve(); // TODO
        }

        return result;
    }

    _getMethodDepsData(method, methodsData) {
        const deps = [].concat(method.deps || []);

        return deps.reduce((result, methodAlias) => {
            return Object.assign(result, {
                [methodAlias]: methodsData[methodAlias]
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

    _getMethodArgs(method, methodsData) {

        if (typeof method.args !== 'function') {
            return method.args;
        }
        const deps = [].concat(method.deps || []);
        const depsData = deps.reduce((result, methodAlias) => {
            return Object.assign(result, {
                [methodAlias]: methodsData[methodAlias]
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
