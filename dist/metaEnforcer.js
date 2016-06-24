'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _v = require('./v1');

var _v2 = _interopRequireDefault(_v);

var _Oid = require('v1sdk/dist/Oid');

var _Oid2 = _interopRequireDefault(_Oid);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getMetaDefinitionFrom = function getMetaDefinitionFrom(command, metaDefinitions) {
    var assetType = getAssetType(command);
    return metaDefinitions.find(function (metaDef) {
        return metaDef.Token === assetType;
    });
};

var getAssetType = function getAssetType(command) {
    var map = {
        'create': function create(command) {
            return command.assetType;
        },
        'update': function update(command) {
            return new _Oid2.default(command.oid).type;
        },
        'execute': function execute(command) {
            return new _Oid2.default(command.oid).type;
        }
    };
    return map[command.command](command);
};

var getAssetTypes = function getAssetTypes(data) {
    return [].concat.apply([], data.map(function (intent) {
        return intent.commands;
    })).map(function (command) {
        return getAssetType(command);
    }).sort().filter(function (value, index, array) {
        return index === 0 || value !== array[index - 1];
    });
};

var getMetaDefinitions = function getMetaDefinitions(v1, sampleData) {
    var data = Array.isArray(sampleData) ? sampleData : [sampleData];
    var uniqueAssetTypes = getAssetTypes(data);
    return Promise.all(uniqueAssetTypes.map(function (assetType) {
        return v1.queryDefinition(assetType);
    }));
};

var getKnownAttributes = function getKnownAttributes(command, metaDefinition) {
    var knownAttributes = {};
    for (var attribute in command.attributes || []) {
        var AssetAttribute = metaDefinition.Token + '.' + attribute;
        if (metaDefinition.Attributes[AssetAttribute]) {
            knownAttributes[attribute] = command.attributes[attribute];
        } else {
            console.log("========>", "drop unknown attribute", AssetAttribute);
        }
    }
    return knownAttributes;
};

var formatUpdateCommand = function formatUpdateCommand(command, metaDefinition) {
    return {
        'command': command.command,
        'oid': command.oid,
        'attributes': getKnownAttributes(command, metaDefinition)
    };
};

var formatCreateCommand = function formatCreateCommand(command, metaDefinition) {
    return {
        'command': command.command,
        'assetType': command.assetType,
        'attributes': getKnownAttributes(command, metaDefinition)
    };
};

var shouldNotDropOperation = function shouldNotDropOperation(command, metaDefinitions) {
    var metaDefinition = getMetaDefinitionFrom(command, metaDefinitions);
    var AssetOperation = metaDefinition.Token + '.' + command.operation;
    var shouldNotDrop = metaDefinition.Operations[AssetOperation];
    if (!shouldNotDrop) {
        console.log("========>", "drop unknown operation", AssetOperation);
    }
    return shouldNotDrop;
};

var getFormattedCommand = function getFormattedCommand(command, metaDefinitions) {
    var metaDefinition = getMetaDefinitionFrom(command, metaDefinitions);
    var commandType = command.command;

    var commandFormatMap = {
        'update': formatUpdateCommand,
        'create': formatCreateCommand,
        'execute': function execute(command) {
            return command;
        }
    };

    return commandFormatMap[commandType](command, metaDefinition);
};

var formatCommands = function formatCommands(intents, metaDefinitions) {
    return intents.map(function (intent) {
        intent.commands = intent.commands.map(function (command) {
            return getFormattedCommand(command, metaDefinitions);
        }).filter(function (command) {
            return command.command !== 'execute' || command.command === 'execute' && shouldNotDropOperation(command, metaDefinitions);
        });
        return intent;
    });
};

exports.default = function (url, sampleData) {
    return new Promise(function (resolve, reject) {
        var v1 = (0, _v2.default)(url, 'admin', 'admin');
        getMetaDefinitions(v1, sampleData).then(function (metaDefinitions, err) {
            var transformedSampleData = formatCommands(sampleData, metaDefinitions);
            resolve(transformedSampleData);
        });
    });
};