import Mustache from 'mustache';
import node from 'when/node';
import parallel from 'when/parallel';
import sequence from 'when/sequence';
import trickle from 'timetrickle';
import V1 from './v1';
import Oid from 'v1sdk/dist/Oid';
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
            create: create,
            update: update,
            execute: execute
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
                    .then(results => {
                        const assets = Array.isArray(results) ? results : [results];
                        assets.forEach((asset, i) => {
                            if(asset) {
                                const oid = asset.id.split(':', 2).join(':');
                                if (asset.Attributes && asset.Attributes && asset.Attributes.Name) {
                                    const name = i ? `${asset.Attributes.Name.value} ${i}` : `${asset.Attributes.Name.value}`;
                                    this.streamVariables[name] = oid;
                                }
                                if (asset.href) {
                                    const type = asset.href.split('rest-1.v1/Data')[1].split('/')[1];
                                    this.streamVariables[type] = oid;
                                }
                            }
                            callback(null, asset);
                        });
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
                const v1 = V1(url, username, password);
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

const create = (v1, command) => {
    const { assetType, attributes, times } = command;
    const Times = Array.apply(null, { length: (times || 1) }).map(Number.call, Number);
    return Promise.all(Times.map(() => v1.create(assetType, attributes)));
};

const update = (v1, command) => {
    const { oid, attributes } = command;
    const { idNumber, type } = new Oid(oid);
    return v1.update(idNumber, type, attributes, '')
};

const execute = (v1, command) => {
    const { oid, operation } = command;
    return v1.executeOperation(oid, operation);
};