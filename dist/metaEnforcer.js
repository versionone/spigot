'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _btoa = require('btoa');

var _btoa2 = _interopRequireDefault(_btoa);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (url, sampleData) {
    return new Promise(function (resolve, reject) {
        getMetaDefinitions(url, sampleData).then(function (metaDefinitions, err) {
            var transformedSampleData = dropUnknownAttributes(sampleData, metaDefinitions);
            resolve(transformedSampleData);
        });
    });
};

var getAssetTypes = function getAssetTypes(data) {
    return [].concat.apply([], data.map(function (intent) {
        return intent.commands;
    })).filter(function (command) {
        return command.command === 'create';
    }).map(function (command) {
        return command.assetType;
    }).sort().filter(function (value, index, array) {
        return index === 0 || value !== array[index - 1];
    });
};

var getMetaDefinitions = function getMetaDefinitions(url, sampleData) {
    var data = Array.isArray(sampleData) ? sampleData : [sampleData];
    var unqiueAssetTypes = getAssetTypes(data);
    return Promise.all(unqiueAssetTypes.map(function (assetType) {
        return new Promise(function (resolve, reject) {
            var root = url.slice(-1) === '/' ? url : url + '/';
            var metaV1Url = root + 'meta.v1/' + assetType;
            _superagent2.default.get(metaV1Url).set('Authorization', 'Basic ' + (0, _btoa2.default)("admin:admin")).set('Accept', 'application/json').end(function (err, response) {
                resolve(response.body);
            });
        });
    }));
};

var dropUnknownAttributes = function dropUnknownAttributes(sampleData, metaDefinitions) {
    sampleData.forEach(function (intent) {
        intent.commands.forEach(function (command) {
            if (command.command === 'create') {
                var metaDefinition;
                var attribute;

                (function () {
                    var assetType = command.assetType;
                    var attributes = command.attributes;
                    metaDefinition = metaDefinitions.find(function (metaDef) {
                        return metaDef.Token === assetType;
                    });

                    for (attribute in attributes) {
                        var AssetAttribute = assetType + '.' + attribute;
                        if (!metaDefinition.Attributes[AssetAttribute]) {
                            console.log("========>", "drop unknown attribute", AssetAttribute);
                            delete attributes[attribute];
                        }
                    }
                })();
            }
        });
    });
    return sampleData;
};