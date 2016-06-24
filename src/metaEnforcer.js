import V1 from './v1'
import Oid from 'v1sdk/dist/Oid';

const getMetaDefinitionFrom = (command, metaDefinitions) => {
    const assetType = getAssetType(command);
    return metaDefinitions.find(metaDef => metaDef.Token === assetType);
};

const getAssetType = command => {
    const map = {
        'create': command => command.assetType,
        'update': command => new Oid(command.oid).type,
        'execute': command => new Oid(command.oid).type
    };
    return map[command.command](command);
};

const getAssetTypes = data => {
    return []
        .concat
        .apply([], data.map(intent => intent.commands))
        .map(command => getAssetType(command))
        .sort()
        .filter((value, index, array) => (index === 0) || (value !== array[index-1]));
};

const getMetaDefinitions = (v1, sampleData) => {
    const data = Array.isArray(sampleData) ? sampleData : [sampleData];
    const uniqueAssetTypes = getAssetTypes(data);
    return Promise.all(uniqueAssetTypes.map(assetType => v1.queryDefinition(assetType)));
};

const getKnownAttributes = (command, metaDefinition) => {
    const knownAttributes = {};
    for(var attribute in (command.attributes || [])) {
        const AssetAttribute = `${metaDefinition.Token}.${attribute}`;
        if(metaDefinition.Attributes[AssetAttribute]) {
            knownAttributes[attribute] = command.attributes[attribute];
        } else {
            console.log("========>", "drop unknown attribute", AssetAttribute);
        }
    }
    return knownAttributes;
};

const formatUpdateCommand = (command, metaDefinition) => ({
    'command': command.command,
    'oid': command.oid,
    'attributes': getKnownAttributes(command, metaDefinition)
});

const formatCreateCommand = (command, metaDefinition) => ({
    'command': command.command,
    'assetType': command.assetType,
    'attributes': getKnownAttributes(command, metaDefinition)
});

const shouldNotDropOperation = (command, metaDefinitions) => {
    const metaDefinition = getMetaDefinitionFrom(command, metaDefinitions);
    const AssetOperation = `${metaDefinition.Token}.${command.operation}`;
    const shouldNotDrop = metaDefinition.Operations[AssetOperation];
    if(!shouldNotDrop){
        console.log("========>", "drop unknown operation", AssetOperation);
    }
    return shouldNotDrop;
};

const getFormattedCommand = (command, metaDefinitions) => {
    const metaDefinition = getMetaDefinitionFrom(command, metaDefinitions);
    const commandType = command.command;

    const commandFormatMap = {
        'update': formatUpdateCommand,
        'create': formatCreateCommand,
        'execute': command => command
    };

    return commandFormatMap[commandType](command, metaDefinition);
};

const formatCommands = (intents, metaDefinitions) => {
    return intents.map(intent => {
        intent.commands = intent.commands
            .map(command => getFormattedCommand(command, metaDefinitions))
            .filter(command => (
                    command.command !== 'execute'
                    || (command.command === 'execute' && shouldNotDropOperation(command, metaDefinitions))
                )
            );
        return intent;
    });
};

export default (url, sampleData) => new Promise(
    (resolve, reject) => {
        const v1 = V1(url, 'admin', 'admin');
        getMetaDefinitions(v1, sampleData).then((metaDefinitions, err) => {
            const transformedSampleData = formatCommands(sampleData, metaDefinitions);
            resolve(transformedSampleData);
        });
    }
);
