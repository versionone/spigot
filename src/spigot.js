import Mustache from 'mustache';
import parallel from 'when/parallel';
import sequence from 'when/sequence';
import trickle from 'timetrickle';
import V1 from './v1';
import when from 'when';
import node from 'when/node';

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
            create: (v1, command, callback) => {
                const { assetType, attributes, times } = command;
                const Times = Array.apply(null, { length: (times || 1) }).map(Number.call, Number)
                Promise.all(Times.map(() => new Promise(
                    (resolve, reject) => {
                        v1.create(assetType, attributes, (err, asset) => {
                            resolve({ err: err, asset: asset });
                        });
                    }
                ))).then(results => {
                    results.forEach((r, i) => callback(r.err, r.asset, i));
                });
            },
            update: (v1, command, callback) => {
                const { oid, attributes } = command;
                v1.update(oid, attributes, callback);
            },
            execute: (v1, command, callback) => {
                const { oid, operation } = command;
                v1.executeOperation(oid, operation, callback);
            }
        };

        this.throttler = this.throttle
            ? trickle(this.throttle, this.throttleInterval || 1000)
            : func => func();


        this.execute = (self, v1, command, callback) => {
            console.log('execute here');
            this.throttler(() => {
                const a = JSON.stringify(command);
                const b = Mustache.render(a, this.streamVariables);
                const c = JSON.parse(b);
                console.log(c);
                this.commands[c.command](v1, c, (err, asset, i) => {
                    if (err) {
                        console.log(err);
                        return callback(err);
                    }
                    let newStreamVariables = [];
                    if (asset && asset.name && i)
                        newStreamVariables.push(`${asset.name} ${i}`);
                    if (asset && asset.name)
                        newStreamVariables.push(asset.name);
                    if (asset && asset.assetType)
                        newStreamVariables.push(asset.type);
                    newStreamVariables.forEach(variable => {
                        this.streamVariables[variable] = asset.oid;
                    });
                    callback(err, asset);
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
                const v1 = new V1(url, username, password);
                const promiseExecute = node.call(this.execute, this, v1, command);
                promiseExecute.done(() => {
                    ++this.totalSent;
                });
                return promiseExecute;
            });

            return Promise.all(executableCommands);
        };

        this.executeSeries = (data, callback) => {
            console.log('launch');
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