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
        .filter(command => command.command === 'create')
        .map(command => command.assetType)
        .sort()
        .filter((value, index, array) => (index === 0) || (value !== array[index-1]));
};

const getMetaDefinitions = (url, sampleData) => {
    const data = Array.isArray(sampleData) ? sampleData : [sampleData];
    const unqiueAssetTypes = getAssetTypes(data);
    return Promise.all(unqiueAssetTypes.map(assetType => {
        return new Promise((resolve, reject) => {
            const metaV1Url = `${url}meta.v1/${assetType}`;
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
    sampleData.forEach(intent => {
        intent.commands.forEach(command => {
            if(command.command === 'create') {
                const { assetType, attributes } = command;
                var metaDefinition = metaDefinitions.find(metaDef => metaDef.Token === assetType);
                for(var attribute in attributes) {
                    const AssetAttribute = `${assetType}.${attribute}`;
                    if(!metaDefinition.Attributes[AssetAttribute]) {
                        console.log("========>", "drop unknown attribute", AssetAttribute);
                        delete attributes[attribute]
                    }
                }
            }
        });
    });
    return sampleData;
};