import Mustache from 'mustache';
import node from 'when/node';
import parallel from 'when/parallel';
import sequence from 'when/sequence';
import trickle from 'timetrickle';
import url from 'url';
import v1jssdk from 'v1jssdk';
import when from 'when';

export default class Spigot {
    constructor({ url, username, password, forever, throttle, throttleInterval }) {
        this.url = url;
        this.username = username;
        this.password = password;
        this.forever = forever;
        this.throttle = throttle;
        this.throttleInterval = throttleInterval;
        this.totalSent = 0;
        this.createdOids = [];

        this.streamVariables = {
            _number: 0,
            number: () => this._number++,
            Number: () => this.number()
        };

        this.commands = {
            create: (v1, command) => {
                const { assetType, attributes, times } = command;
                const Times = Array.apply(null, { length: (times || 1) }).map(Number.call, Number);
                return Promise.all(Times.map(() => new Promise(
                    (resolve, reject) => {
                        v1.create(assetType, attributes)
                            .then(asset => {
                                resolve(asset);
                            });
                    }
                )))/*.then(results => {
                    results.forEach((r, i) => callback(r.err, r.asset, i));
                });*/
            },
            update: (v1, command) => {
                const { oid, attributes } = command;
                return Promise.resolve((resolve, reject) => {
                    v1.update(oid, attributes)
                        .then(rawResult => {
                            if (!rawResult){
                                reject(new Error())
                            }
                            resolve(rawResult._v1_current_data);
                        })
                        .catch(error => {
                            reject(error);
                        });
                });
            },
            execute: (v1, command) => {
                const { oid, operation } = command;
                return Promise.resolve((resolve, reject) => {
                    v1.executeOperation(oid, operation)
                        .then(rawResult => {
                            if (!rawResult) {
                                reject(new Error());
                            }
                            resolve(rawResult._v1_current_data);
                        })
                        .catch(error => {
                            reject(error);
                        });
                });
            }
        };

        this.throttler = this.throttle
            ? trickle(this.throttle, this.throttleInterval || 1000)
            : func => func();


        this.execute = (self, v1, command, callback) => {
            this.throttler(() => {
                const a = JSON.stringify(command);
                const b = Mustache.render(a, this.streamVariables);
                const c = JSON.parse(b);
                console.log(c);
                this.commands[c.command](v1, c)
                    .then((asset, i) => {
                        const newStreamVariables = [];
                        if (asset && asset.name && i)
                            newStreamVariables.push(`${asset.name} ${i}`);
                        if (asset && asset.name)
                            newStreamVariables.push(asset.name);
                        if (asset && asset.assetType)
                            newStreamVariables.push(asset.type);
                        newStreamVariables.forEach(variable => {
                            this.streamVariables[variable] = asset.oid;
                        });
                        callback(null, asset);
                    })
                    .catch(error => {
                        console.log(error);
                        callback(error)
                    });
            });
        };
        this.startRateWatcher = totalCommands => {
            this.startTime = +Date.now();
            this.lastTotalSent = 0;
            this.totalSent = 0;
            this.totalCommands = totalCommands;

            this.rateReportInterval = setInterval(() => {
                const now = +Date.now();
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write('Rate: ' + (this.totalSent - this.lastTotalSent) + "/s");
                this.lastTotalSent = this.totalSent;
                this.startTime = now;

                if (this.totalSent >= this.totalCommands) {
                    clearInterval(this.rateReportInterval);
                    console.log("Done");
                }
            }, 1000);
        };

        this.wrapForExecution = data => {
            const url = data.url || this.url;
            const username = data.username || this.username;
            const password = data.password || this.password;
            const executableCommands = data.commands.map(command => () => {
                const v1 = getV1Instance(url, username, password);
                const promiseExecute = node.call(this.execute, this, v1, command);
                promiseExecute.done(() => {
                    ++this.totalSent;
                });
                return promiseExecute;
            });

            return Promise.all(executableCommands);
        };

        this.executeSeries = (data, callback) => {
            this.executeBatch(data, sequence, callback);
        };

        this.executeParallel = (data, callback) => {
            this.executeBatch(data, parallel, callback);
        };

        this.executeBatch = (data, method, callback) => {
            let once = true;
            when.iterate(() => {
                const payload = Array.isArray(data) ? data : [data];
                const executions = Promise.all(payload.map(d => method(this.wrapForExecution(d))));
                return executions;
            }, () => {
                return !this.forever && !once;
            }, (x) => {
                once = false;
                return x;
            }, 0).done(() => {
                if(callback) callback(null, this.createdOids);
            });
        };
    };
}
const getV1Instance = (v1Url, username, password) => {
    const urlInfo = url.parse(v1Url);
    const hostname = urlInfo.hostname;
    const instance = urlInfo.pathname.replace('/', '');
    const protocol = urlInfo.protocol.replace(':', '');
    let port = urlInfo.port;
    if (!urlInfo.port)
        port = protocol == "https" ? 443 : 80;

    return new v1jssdk.V1Meta({
        hostname: hostname,
        instance: instance,
        port: port,
        protocol: protocol,
        username: username,
        password: password,
        post: (url, data, headerObj) => {

        },
        get: (url, data) => {

        }
    });
};