import _ from 'underscore';
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

const getAssetTypes = sampleData => {
    const data = Array.isArray(sampleData) ? sampleData : [sampleData];
    const assetTypes = _
        .flatten(data.map(intent => intent.commands))
        .filter(function(command){ return command.command === 'create' })
        .map(function(command) { return command.assetType });
    return _.uniq(assetTypes, assetType => assetType);
};

const getMetaDefinitions = (url, sampleData) => {
    const unqiueAssetTypes = getAssetTypes(sampleData);
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