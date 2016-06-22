import request from 'superagent';
import btoa from 'btoa';

export default (url, sampleData) => new Promise(
    (resolve, reject) => {
        getMetaDefinitions(url, sampleData).then((metaDefinitions, err) => {
            const transformedSampleData = dropUnknownAttributes(sampleData, metaDefinitions);
            resolve(transformedSampleData);
        });
    }
);

const getAssetTypes = data => {
    return []
        .concat
        .apply([], data.map(intent => intent.commands))
        .map(command => getAssetType(command))
        .sort()
        .filter((value, index, array) => (index === 0) || (value !== array[index-1]));
};

const getAssetType = command => {
    const map = {
        'create': command => command.assetType,
        'update': command => command.oid.split(':')[0],
        'execute': command => command.oid.split(':')[0]
    };
    return map[command.command](command);
};

const getMetaDefinitions = (url, sampleData) => {
    const data = Array.isArray(sampleData) ? sampleData : [sampleData];
    const unqiueAssetTypes = getAssetTypes(data);
    return Promise.all(unqiueAssetTypes.map(assetType => {
        return new Promise((resolve, reject) => {
            const root = url.slice(-1) === '/' ? url : `${url}/`;
            const metaV1Url = `${root}meta.v1/${assetType}`;
            request
                .get(metaV1Url)
                .set('Authorization', `Basic ${btoa("admin:admin")}`)
                .set('Accept', 'application/json')
                .end((err, response) => {
                    resolve(response.body);
                });
        });
    }));
};

const dropUnknownAttributes = (sampleData, metaDefinitions) => {
    const commandsToDrop = [];
    sampleData.forEach(intent => {
        intent.commands.forEach(command => {
            const assetType = getAssetType(command);
            const metaDefinition = metaDefinitions.find(metaDef => metaDef.Token === assetType);

            const commandType = command.command;

            if(commandType === 'create' || commandType === 'update') {
                const attributes = command.attributes || [];
                for(var attribute in attributes) {
                    const AssetAttribute = `${assetType}.${attribute}`;
                    if(!metaDefinition.Attributes[AssetAttribute]) {
                        console.log("========>", "drop unknown attribute", AssetAttribute);
                        delete attributes[attribute]
                    }
                }
            }
            else if(commandType === 'execute') {
                const AssetOperation = `${assetType}.${command.operation}`;
                if(!metaDefinition.Operations[AssetOperation]) {
                    console.log("========>", "drop unknown operation", AssetOperation);
                    commandsToDrop.push(command);
                }
            }

        });
    });

    sampleData.forEach(intent => {
        intent.commands = intent.commands.filter(command => commandsToDrop.indexOf(command) <= -1)
    });
    return sampleData;
};