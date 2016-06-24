import request from 'superagent';
import url from 'url';
import { V1Meta } from 'v1sdk';

export default (v1Url, username, password) => {
    const urlInfo = url.parse(v1Url);
    const hostname = urlInfo.hostname;
    const instance = urlInfo.pathname.replace('/', '');
    const protocol = urlInfo.protocol.replace(':', '');
    let port = urlInfo.port;
    if (!urlInfo.port)
        port = protocol == "https" ? 443 : 80;

    return new V1Meta({
        hostname: hostname,
        instance: instance,
        port: port,
        protocol: protocol,
        username: username,
        password: password,
        postFn: (url, data, headerObj) => new Promise(
            (resolve, reject) => {
                request
                    .post(url)
                    .send(data)
                    .set(headerObj)
                    .end((error, response) => {
                        error ? reject(error) : resolve(response.body);
                    });
            }
        )
    });
};