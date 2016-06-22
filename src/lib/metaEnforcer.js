import _ from 'underscore';
import request from 'superagent';
import btoa from 'btoa';
import when from 'when';

export default class MetaEnforcer {
    constructor() {
        this.transformCommands = (url, sampleData) => {
            return when.promise((resolve, reject) => {
                this.getMetaDefinitions(url, sampleData).then((metaDefinitions, err) => {
                    const transformedSampleData = this.dropUnknownAttributes(sampleData, metaDefinitions);
                    resolve(transformedSampleData);
                });
            });
        };

        this.getAssetTypes = sampleData => {
            const data = Array.isArray(sampleData) ? sampleData : [sampleData];
            const assetTypes = _
                .flatten(data.map(intent => intent.commands))
                .filter(function(command){ return command.command === 'create' })
                .map(function(command) { return command.assetType });
            return _.uniq(assetTypes, assetType => assetType);
        };

        this.getMetaDefinitions = (url, sampleData) => {
            const unqiueAssetTypes = this.getAssetTypes(sampleData);
            return when.all(unqiueAssetTypes.map(assetType => {
                return when.promise((resolve, reject) => {
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

        this.dropUnknownAttributes = (sampleData, metaDefinitions) => {
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
        }
    }
}