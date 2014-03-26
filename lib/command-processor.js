(function() {
    var _ = require('underscore');
    var async = require('async');
    var V1 = require('./v1');

    var CommandProcessor = function(url, username, password) {
        var v1 = new V1(url, username, password);

        this.commands = {
            create: function(command, callback) {
                var assetType = command.assetType
                var attributes = command.attributes
                v1.create(assetType, attributes, callback);
            },
            update: function(command, callback) {
                var oid = command.oid;
                var attributes = command.attributes;
                v1.update(oid, attributes, callback);
            },
            execute: function(command, callback) {
                var oid = command.oid;
                var operation = command.operation;
                v1.executeOperation(oid, operation, callback);
            }
        }
    };

    CommandProcessor.prototype.wrapForExecution = function(commands) {
        var self = this;
        var executableCommands = _.map(commands, function(command) {
            return function(callback) {
                self.execute(command, callback);
            }
        });

        return executableCommands;
    };


    CommandProcessor.prototype.execute = function(command, callback) {
        this.commands[command.command](command, callback);
    };

    var report = function(err, results) {
      console.log('here')
        if (err) {
            console.log("Error:", err)
        } else {
            console.log("Done", results)
        }
    }


    CommandProcessor.prototype.executeSeries = function(commands) {
        async.series(this.wrapForExecution(commands), report);
    }

    CommandProcessor.prototype.executeParallel = function(commands) {
        async.series(this.wrapForExecution(commands), report);
    }

    module.exports = CommandProcessor;
})();
