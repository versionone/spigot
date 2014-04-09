(function() {
    var url = require('url');
    var v1sdk = require('v1jssdk');
    var V1Meta = v1sdk.V1Meta;
    var V1Server = v1sdk.V1Server;

    var v1 = function(v1Url, username, password) {
        var urlInfo = url.parse(v1Url);
        var hostname = urlInfo.host;
        var instance = urlInfo.pathname.replace('/', '');
        var protocol = urlInfo.protocol.replace(':', '');
        var port = urlInfo.port;
        if (!urlInfo.port)
            port = protocol == "https" ? 443 : 80;

        this._server = new V1Server(hostname, instance, username, password, port, protocol);
        this._v1 = new V1Meta(this._server);
    };

    v1.prototype.create = function(assetType, attributes, callback) {
        this._v1.create(assetType, attributes, function(err, rawResult) {
            if (!rawResult) return callback;
            var result = {
                oid: rawResult._v1_id,
                assetType: rawResult._v1_id.split(':')[0],
                name: rawResult._v1_current_data.Name
            };

            callback(null, result);
        });
    };

    v1.prototype.update = function(oid, attributes, callback) {
        var idTokens = oid.split(":");
        var assetType = idTokens[0];
        var id = idTokens[1];
        this._v1.update(assetType, id, attributes, function(err, rawResult) {
            if (!rawResult) return callback(err);
            var result = rawResult._v1_current_data;
            callback(null, result);
        });
    };

    v1.prototype.executeOperation = function(oid, operation) {
      var idTokens = oid.split(":");
      var assetType = idTokens[0];
      var id = idTokens[1];

      this._server.execute_operation({
        asset_type_name: assetType,
        id: id,
        opname: operation
      }, function(err, rawResult){
        callback(err, rawResult);
      });
    }

    module.exports = v1;
})();
