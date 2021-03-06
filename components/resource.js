module.exports = class {

    constructor() {
        this._resources = {};
    }

    callMethod(resourceData, methodParams) {
        const resource = this.getResource(resourceData.resource);

        return resource.callMethod(resourceData.params, methodParams);
    }

    getResource(name) {

        if (!this._resources[name]) {
            const resourcePath = 'app-resource-' + name;
            // eslint-disable-next-line global-require, import/no-dynamic-require
            const Resource = require(resourcePath);

            this._resources[name] = new Resource();
        }

        return this._resources[name];
    }
};
