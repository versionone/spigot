(function() {
    var _ = require('underscore');
    var async = require('async');
    var V1 = require('./v1');

    var CommandProcessor = function(url, username, password) {
        this.url = url;
        this.username = username;
        this.password = password;

        this.commands = {
            create: function(v1, command, callback) {
                var assetType = command.assetType
                var attributes = command.attributes
                v1.create(assetType, attributes, callback);
            },
            update: function(v1, command, callback) {
                var oid = command.oid;
                var attributes = command.attributes;
                v1.update(oid, attributes, callback);
            },
            execute: function(v1, command, callback) {
                var oid = command.oid;
                var operation = command.operation;
                v1.executeOperation(oid, operation, callback);
            }
        }
    };

    CommandProcessor.prototype.wrapForExecution = function(data) {
        var self = this;
        var url = data.url || this.url;
        var username = data.username || this.username;
        var password = data.password || this.password;
        var executableCommands = _.map(data.commands, function(command) {
            return function(callback) {
                var v1 = new V1(url, username, password);
                self.execute(v1, command, callback);
            }
        });

        return executableCommands;
    };


    CommandProcessor.prototype.execute = function(v1, command, callback) {
        this.commands[command.command](v1, command, callback);
    };

    var report = function(err, results) {
        if (err) {
            console.log("Error:", err)
        } else {
            console.log("Done", results)
        }
    }


    CommandProcessor.prototype.executeSeries = function(data) {
        var self = this;
        if (_.isArray(data))
            _.each(data, function(d) {
                async.series(self.wrapForExecution(d), report);
            });
        else
            async.series(self.wrapForExecution(data), report);
    }

    CommandProcessor.prototype.executeParallel = function(data) {
        var self = this;
        if (_.isArray(data))
            _.each(data, function(d) {
                async.parallel(self.wrapForExecution(d), report);
            });
        else
            async.parallel(self.wrapForExecution(data), report);
    }

    module.exports = CommandProcessor;
})();
