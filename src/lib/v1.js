import url from 'url';
import { V1Meta, V1Server } from 'v1jssdk';

export default class V1 {
    constructor(v1Url, username, password) {
        const urlInfo = url.parse(v1Url);
        const hostname = urlInfo.hostname;
        const instance = urlInfo.pathname.replace('/', '');
        const protocol = urlInfo.protocol.replace(':', '');
        let port = urlInfo.port;
        if (!urlInfo.port)
            port = protocol == "https" ? 443 : 80;

        this._server = new V1Server(hostname, instance, username, password, port, protocol);
        this._v1 = new V1Meta(this._server);

        this.create = (assetType, attributes, callback) => {
            this._v1.create(assetType, attributes, (err, rawResult) => {
                if(err) console.log(err);

                if (!rawResult) return callback;
                const result = {
                    oid: rawResult._v1_id,
                    assetType: rawResult._v1_id.split(':')[0],
                    name: rawResult._v1_current_data.Name
                };

                callback(null, result);
            });
        };

        this.update = (oid, attributes, callback) => {
            const idTokens = oid.split(":");
            const assetType = idTokens[0];
            const  id = idTokens[1];
            this._v1.update(assetType, id, attributes, function(err, rawResult) {
                if(err) console.log(err);

                if (!rawResult) return callback(err);
                const result = rawResult._v1_current_data;
                callback(null, result);
            });
        };

        this.executeOperation = (oid, operation, callback) => {
            const idTokens = oid.split(":");
            const assetType = idTokens[0];
            const id = idTokens[1];
            const op = {
                asset_type_name: assetType,
                id: id,
                opname: operation
            };

            this._server.execute_operation(op, (err, rawResult) => {
                if(err) console.log(err);

                if (!rawResult) return callback(err);
                const result = rawResult._v1_current_data;
                callback(null, result);
            });
        }

    }
}