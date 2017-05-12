const logger = require('logger')();
const Resource = require('./components/resource');
const resource = new Resource();

module.exports = class {

    callMethods(methods) {
        this._methods = methods;

        // todo
        this._methodsData = {};

        const dataAliasesLevels = this._getDataAliasesLevels();
        let result = Promise.resolve();

        dataAliasesLevels.forEach(dataAliases => {
            result = result
                .then(() => Promise.all(
                    this._callMethods(dataAliases)
                ))
                .then(items => {
                    items.forEach((item, index) => {
                        const methodAlias = dataAliases[index];

                        this._methodsData[methodAlias] = item;
                    })
                });
        });

        return result.then(() => this._methodsData);
    }

    _getDataAliasesLevels() {
        const methods = this._methods;
        const result = [];

        function setDepsLevels(dataAlias, index) {
            const method = methods[dataAlias].method;

            if (!method) {
                throw new Error(`Can't resolve "${dataAlias}" dependency`);
            }

            const depsDataAliases = [].concat(method.deps || []);

            if (!result[index]) {
                result[index] = [];
            }

            if (!result[index].includes(dataAlias)) {
                result[index].push(dataAlias);
            }

            if (depsDataAliases.length) {

                depsDataAliases.map(depsMethodAlias => {
                    setDepsLevels(depsMethodAlias, index + 1);
                });
            }
        }

        Object
            .keys(methods)
            .forEach((dataAlias, index) => {
                setDepsLevels(dataAlias, 0);
            });

        return result.reverse();
    }

    _callMethods(dataAliases) {
        return dataAliases.map(dataAlias => {
            const method = this._methods[dataAlias].method;
            // const methodsData = this._methodsData;
            //
            // if (methodsData[dataAlias]) {
            //     return methodsData[dataAlias];
            // }

            return this._callMethod(dataAlias);
        });
    }

    _callMethod(dataAlias) {
        const data = this._methods[dataAlias];
        const method = data.method;
        let result;

        const depsData = this._getMethodDepsData(method);

        if (typeof method.guard === 'function') {
            method.guard = method.guard(depsData);
        }

        if (method.guard === undefined || method.guard) {
            logger.info('Call:', dataAlias, JSON.stringify(data));

            method.params = this._getMethodParams(method);
            result = resource.callMethod(data.resource, method.params);

            this.addCallbackAfter(result, method);
        } else {
            logger.info('Guard:', dataAlias, JSON.stringify(data)); // TODO

            result = Promise.resolve(); // TODO
        }

        return result;
    }

    _getMethodDepsData(method) {
        const deps = [].concat(method.deps || []);

        return deps.reduce((result, dataAlias) => {
            return Object.assign(result, {
                [dataAlias]: this._methodsData[dataAlias]
            });
        }, {});
    }

    _getMethodParams(method) {

        if (typeof method.params !== 'function') {
            return method.params;
        }

        const deps = [].concat(method.deps || []);
        const depsData = deps.reduce((result, methodAlias) => {
            return Object.assign(result, {
                [methodAlias]: this._methodsData[methodAlias]
            });
        }, {});

        return method.params(depsData);
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
