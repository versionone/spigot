var _ = require('underscore');
var request = require('superagent');
var btoa = require('btoa');
var when = require('when');

function transformCommandsForAVersionOfMeta(url, sampleData) {
    return when.promise(function(resolve, reject) {
        getMetaDefinitions(url, sampleData).then(function(metaDefinitions, err) {
            var transformedSampleData = dropUnknownAttributes(sampleData, metaDefinitions);
            resolve(transformedSampleData);
        });
    });
}

function getAssetTypes(sampleData) {
    var data = Array.isArray(sampleData) ? sampleData : [sampleData];

    var flattenedCommands = _.flatten(data.map(function(intent) {
        return intent.commands
    }));

    var assetTypes = flattenedCommands
        .filter(function(command){ return command.command === 'create' })
        .map(function(command) { return command.assetType });

    return _.uniq(assetTypes, function(assetType) { return assetType });
}

function getMetaDefinitions(url, sampleData) {

    var unqiueAssetTypes = getAssetTypes(sampleData);
    return when.all(unqiueAssetTypes.map(function(assetType) {
        return when.promise(function(resolve, reject) {
            var metaV1Url = url + 'meta.v1/' + assetType;
            request
                .get(metaV1Url)
                .set('Authorization', "Basic " + btoa("admin:admin"))
                .set('Accept', 'application/json')
                .end(function(err, response) {
                    resolve(response.body);
                });
            });
    }));
}

function dropUnknownAttributes(sampleData, metaDefinitions) {
    sampleData.forEach(function(intent) {
        intent.commands.forEach(function(command) {
           if(command.command === 'create') {
               var assetType = command.assetType;
               var metaDefinition = metaDefinitions.find(function(metaDef) {
                  return metaDef.Token === assetType
               });
               for(var attribute in command.attributes) {
                   if(!metaDefinition.Attributes[assetType + "." + attribute]) {
                       console.log("========>", "drop unknown attribute", assetType + "." + attribute);
                       delete command.attributes[attribute]
                   }
               }
           }
        });
    });
    
    return sampleData;
}

module.exports = transformCommandsForAVersionOfMeta;