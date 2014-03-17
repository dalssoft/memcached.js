/*
 * Memcached.Js
 *
 * ASCII Protocol: https://github.com/memcached/memcached/blob/master/doc/protocol.txt
 */

"use strict";

var util = require('util');
var log = require('./memcached.log.js');

var MemcachedCommand = function () {};

	MemcachedCommand.prototype.commandName = "";

	MemcachedCommand.prototype.checkCommandName = function (commandName) { return (commandName == this.commandName );};

	MemcachedCommand.tryReadCommand = function (data) {
		var data = data.toString();
		var cmdTokenPosition = data.indexOf(" ");
		if (cmdTokenPosition == -1) cmdTokenPosition = data.indexOf('\r\n');
		if (cmdTokenPosition == -1) cmdTokenPosition = data.indexOf('\n');

		var result = data.substring(0, cmdTokenPosition);

		log.write(function(){ return "MemcachedCommand.tryReadCommand: " + util.inspect(result, true, 5, true)}, 2);
		return result;
	};

	MemcachedCommand.tryParseRetrievalCommand = function (data) {
		var result = null;
		var end_token = '\r\n';
		var data = data.toString();
		var commandLine = data.substring(0, data.indexOf(end_token));
		if (commandLine)
		{
			var tmpParams = commandLine.split(" ");
			result = {
				"packageCommandLength": commandLine.length + end_token.length,
				"command": tmpParams[0],
				"keys": tmpParams.slice(1, tmpParams.length)
			}
			log.write(function(){
				return "MemcachedCommand.tryParseRetrievalCommand: (command parsed): "
				+ " command: " + result.command + " keys: " + result.keys;
			}, 2);
		}
		log.write(function(){ return "MemcachedCommand.tryParseRetrievalCommand: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	};

	MemcachedCommand.tryParseStorageCommand = function (data) {
		var result = null;
		var end_token = '\r\n';
		var bigCommandLenght = 1024;

		// try to parse big commands without transform the entire data to string.
		// Try to get only the first 1024 bytes of it.
		var dataCmd = null;
		if (data.length > bigCommandLenght)
			dataCmd = data.slice(0, bigCommandLenght).toString();
		else
			dataCmd = data.toString();

		var endCommandLine = dataCmd.indexOf(end_token);
		var commandLine = dataCmd.substring(0, endCommandLine);
		var tmpParams = commandLine.split(" ");
		var bytes = parseInt(tmpParams[4]);
		if (bytes < (data.length - endCommandLine + end_token.length)) {
			var startPos = endCommandLine + end_token.length;

			// Option 1: data.toString() - amazing, but it's the best one
			//var commandDataStr = data.toString().substr(startPos, bytes);
			//var commandData = new Buffer(commandDataStr);

			// Option 2: data.slice().toString() - the same as above... What?
			// Also it will lead to a wrong utf string size
			//var commandDataStr = data.slice(startPos, startPos + bytes).toString();
			//var commandData = new Buffer(commandDataStr);

			// Option 3: data.slice() - bad
			var commandData = data.slice(startPos, startPos + bytes);

			// Option 4: data.copy() - bad as well
			//var commandData = new Buffer(bytes);
			//data.copy(commandData, 0, startPos, startPos + bytes);

			result = {
				"packageCommandLength": commandLine.length + end_token.length + commandData.length + end_token.length,
				"command": tmpParams[0],
				"key": tmpParams[1],
				"flags": tmpParams[2],
				"exptime": tmpParams[3],
				"bytes": tmpParams[4],
				"data": commandData
			};
			log.write(function(){
				return "MemcachedCommand.tryParseStorageCommand: (command parsed): "
				+ " command:" + result.command + " key:" + result.key + " bytes:" + result.bytes + " data:" + result.data;
			}, 2);
		}
		else
			log.write(function(){
				return "MemcachedCommand.tryParseStorageCommand: (command not parsed): "
				+ " command line:" + commandLine;
			}, 2);

		log.write(function(){ return "MemcachedCommand.tryParseStorageCommand: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	};

	MemcachedCommand.tryParseGenericCommand = function (data) {

		var result = null;
		var end_token = '\n';
		var data = data.toString();
		var commandLine = data.substring(0, data.indexOf(end_token));
		if (commandLine)
		{
			var tmpParams = commandLine.split(" ");
			result = {
				"packageCommandLength": commandLine.length + end_token.length,
				"command": tmpParams[0]
			}
		}
		log.write(function(){ return "MemcachedCommand.tryParseGenericCommand: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	};

function MemcachedGetCommand () {
	this.commandName = "get";
	this.params = null;
	this.packageCommandLength = 0;

	this.tryParseData = function (memcachedData) {

		var result = false;
		this.params = MemcachedCommand.tryParseRetrievalCommand(memcachedData);
		if (this.params) {
			this.packageCommandLength = this.params.packageCommandLength;
			result = true;
		}

		log.write(function(){ return "MemcachedGetCommand.tryParseData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	};

	this.processData = function (memcached) {

		memcached.stats.cmd_get++;

		var params = this.params;

		var result = null;
		var crlf = '\r\n';
		for (var x in params.keys) {
			var key = params.keys[x];

			var cache_result = memcached.cache.getItem(key);
			if (cache_result != null)
			{
				var buffers = result ? [result]: [];
				buffers = buffers.concat([
					new Buffer("VALUE " + cache_result.key + " " + cache_result.flags + " " + cache_result.data.length + crlf),
					cache_result.data,
					new Buffer(crlf)]);
				result = Buffer.concat(buffers);

				memcached.stats.get_hits++;
			} else {
				memcached.stats.get_misses++;
			}
		}
		var endCommand = "END" + crlf;
		var buffers = result ? [result]: [];
		buffers = buffers.concat([new Buffer(endCommand)]);
		result = Buffer.concat(buffers);

		log.write(function(){ return "MemcachedGetCommand.processData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	}
}; util.inherits(MemcachedGetCommand, MemcachedCommand);

function MemcachedSetCommand () {
	this.commandName = "set";
	this.params = null;
	this.packageCommandLength = 0;

	this.tryParseData = function (data) {

		var result = false;
		this.params = MemcachedCommand.tryParseStorageCommand(data);
		if (this.params) {
			this.packageCommandLength = this.params.packageCommandLength;
			result = true;
		}

		log.write(function(){ return "MemcachedSetCommand.tryParseData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	};
	this.processData = function (memcached) {

		memcached.stats.cmd_set++;

		var params = this.params;

		memcached.cache.setItem(params.key, params.data, params.exptime, params.flags);

		memcached.stats.total_items++;

		var result = new Buffer("STORED\r\n");

		log.write(function(){ return "MemcachedSetCommand.processData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	}
}; util.inherits(MemcachedSetCommand, MemcachedCommand);

function MemcachedAddCommand () {
	this.commandName = "add";
	this.params = null;
	this.packageCommandLength = 0;

	this.tryParseData = function (data) {

		var result = false;
		this.params = MemcachedCommand.tryParseStorageCommand(data);
		if (this.params) {
			this.packageCommandLength = this.params.packageCommandLength;
			result = true;
		}

		log.write(function(){ return "MemcachedAddCommand.tryParseData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	};

	this.processData = function (memcached) {

		var params = this.params;

		var added = memcached.cache.addItem(params.key, params.data, params.exptime, params.flags);

		var result = "";
		if (added)
		{
			result = "STORED\r\n";
			memcached.stats.total_items++;
		} else {
			result = "NOT_STORED\r\n";
		}

		log.write(function(){ return "MemcachedAddCommand.processData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	}
}; util.inherits(MemcachedAddCommand, MemcachedCommand);

function MemcachedReplaceCommand () {
	this.commandName = "replace";
	this.params = null;
	this.packageCommandLength = 0;

	this.tryParseData = function (data) {

		var result = false;
		this.params = MemcachedCommand.tryParseStorageCommand(data);
		if (this.params) {
			this.packageCommandLength = this.params.packageCommandLength;
			result = true;
		}

		log.write(function(){ return "MemcachedReplaceCommand.tryParseData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	};

	this.processData = function (memcached) {

		var params = this.params;

		var replaced = memcached.cache.replaceItem(params.key, params.data, params.exptime, params.flags);

		var result = "";
		if (replaced)
		{
			result = "STORED\r\n";
			memcached.stats.total_items++;
		} else {
			result = "NOT_STORED\r\n";
		}

		log.write(function(){ return "MemcachedReplaceCommand.processData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	}
}; util.inherits(MemcachedReplaceCommand, MemcachedCommand);

function MemcachedDeleteCommand () {
	this.commandName = "delete";
	this.params = null;
	this.packageCommandLength = 0;

	this.tryParseData = function (data) {

		var result = false;
		this.params = this._parseDeleteCommand(data);
		if (this.params) {
			this.packageCommandLength = this.params.packageCommandLength;
			result = true;
		}

		log.write(function(){ return "MemcachedDeleteCommand.tryParseData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	};

	this.processData = function (memcached) {

		var params = this.params;

		var deleted = memcached.cache.deleteItem(params.key);

		var result = (deleted ? "DELETED\r\n" : "NOT_FOUND\r\n");
		log.write(function(){ return "MemcachedDeleteCommand.processData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	}

	this._parseDeleteCommand = function (data) {

		var result = null;
		var end_token = '\r\n';
		var data = data.toString();
		var commandLine = data.substring(0, data.indexOf(end_token));
		if (commandLine)
		{
			var tmpParams = commandLine.split(" ");
			result = {
				"packageCommandLength": commandLine.length + end_token.length,
				"command": tmpParams[0],
				"key": tmpParams[1],
				"time": tmpParams[2]
			}
		}
		log.write(function(){ return "MemcachedDeleteCommand._parseDeleteCommand: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	};


}; util.inherits(MemcachedDeleteCommand, MemcachedCommand);

function MemcachedStatsCommand () {
	this.commandName = "stats";
	this.params = null;
	this.packageCommandLength = 0;

	this.tryParseData = function (data) {

		var result = false;
		this.params = MemcachedCommand.tryParseGenericCommand(data);
		if (this.params) {
			this.packageCommandLength = this.params.packageCommandLength;
			result = true;
		}

		log.write(function(){ return "MemcachedStatsCommand.tryParseData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	};

	this.processData = function (memcached) {

		var result = "";
		// use MemcachedStatistics members as is
		for (var x in memcached.stats) {
			if (x.substring(0,1) == '_') continue; //private member
			var val = memcached.stats[x];
			val = (typeof val === "function" ? memcached.stats[x]() : val) //execute if it's a function
			result = result + "STAT " + x + " " + val + "\r\n";
		};
		result += "END" + "\r\n";

		log.write(function(){ return "MemcachedStatsCommand.processData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	}
}; util.inherits(MemcachedStatsCommand, MemcachedCommand);

function MemcachedFlushCommand () {
	this.commandName = "flush_all";
	this.params = null;
	this.packageCommandLength = 0;

	this.tryParseData = function (memcachedData) {

		var result = false;
		this.params = MemcachedCommand.tryParseGenericCommand(memcachedData);
		if (this.params) {
			this.packageCommandLength = this.params.packageCommandLength;
			result = true;
		}

		log.write(function(){ return "MemcachedFlushCommand.tryParseData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	};

	this.processData = function (memcached) {

		memcached.stats.cmd_flush++;

		memcached.cache.flush();

		var result = "OK\r\n";
		log.write(function(){ return "MemcachedFlushCommand.processData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	}
}; util.inherits(MemcachedFlushCommand, MemcachedCommand);

function MemcachedAnyCommand () {
	this.params = null;
	this.packageCommandLength = 0;
	this.checkCommandName = function (commandName) { return true; };
	this.tryParseData = function (memcachedData) {

		var result = false;
		this.params = MemcachedCommand.tryParseGenericCommand(memcachedData);
		if (this.params) {
			this.packageCommandLength = this.params.packageCommandLength;
			result = true;
		}

		log.write(function(){ return "MemcachedAnyCommand.tryParseData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	};
	this.processData = function (memcached) {
		var result = new Buffer("ERROR\r\n");
		log.write(function(){ return "MemcachedAnyCommand.processData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	};
}; util.inherits(MemcachedAnyCommand, MemcachedCommand);

function MemcachedCommandList () {

	// command order
	this.commands = [
		new MemcachedGetCommand(),
		new MemcachedSetCommand(),
		new MemcachedAddCommand(),
		new MemcachedReplaceCommand(),
		new MemcachedDeleteCommand(),
		new MemcachedStatsCommand(),
		new MemcachedFlushCommand(),
		new MemcachedAnyCommand()
	];

	this.getCommand = function (mdata) {

		var commandName = mdata.commandName;
		if (!mdata.commandName) {
			mdata.commandName = commandName = MemcachedCommand.tryReadCommand(mdata.data);
		}

		var result = null;

		for (var x in this.commands) {
			var command = this.commands[x];
			if (command.checkCommandName(commandName)) {
				result = command;
				break;
			}
		}

		log.write(function(){ return "MemcachedCommandList.getCommand: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	}
}

exports.MemcachedCommandList = MemcachedCommandList;
