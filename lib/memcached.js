/*
 * Memcached.Js
 * 
 * Protocol: https://github.com/memcached/memcached/blob/master/doc/protocol.txt
 */

"use strict";

var util = require('util');
var net = require('net');
var log = require('./memcached.log.js');
var cmd_ascii = require('./memcached.ascii.commands.js');
var cmd_bin = require('./memcached.bin.commands.js');
var cache = require('./memcached.cache.js');

function MemcachedStatistics (memcached)
{
	this._memcached = memcached;
	this._startTime = new Date();
	this.version = this._memcached.version;
	this.pid = process.pid;
	this.time = function() { return (new Date).getTime() };
	this.curr_connections = function() { return 1 };	//fake
	this.uptime = function() { return parseInt(((new Date).getTime() - this._startTime.getTime()) / 1000) };
	this.cmd_get = 0;
	this.cmd_set = 0;
	this.cmd_flush = 0;
	this.get_hits = 0;
	this.get_misses = 0;
	this.bytes = function() { return this._memcached.cache.getByteSize(); };
	this.bytes_read = 0;
	this.bytes_written = 0;
	this.limit_maxbytes = memcached.cache.maxCacheSize;
	this.evictions = function() { return this._memcached.cache.getEvictions(); };
	this.curr_items = function() { return this._memcached.cache.getLength(); };
	this.total_items = 0;

}

function MemcachedData (data)
{
	this.data = data;
	
	this.addData = function (data) {
		var newData = new Buffer(this.data.length + data.length);
		this.data.copy(newData, 0);
		data.copy(newData, this.data.length);
		this.data = newData;
		log.write(function(){ return "MemcachedData.addData!"; }, 3);
	}
}

function MemcachedTCPDataHandler (memcached) {
	
	this.memcached = memcached; 
	this.mdata = null;
	this.cmd = null;

	this.process = function (data, callback) {
		
		this.memcached.stats.bytes_read += data.length;
		
		if (!this.mdata) 
			this.mdata = new MemcachedData(data); 
		else
			this.mdata.addData(data);
			
		var cmd = this.cmd = cmd_ascii;
		if (cmd_bin.isBinaryProtocol(data)) cmd = this.cmd = cmd_bin;
		
		var mdata = this.mdata;
		var result = null;
		// The data from socket can have one command, many commands or 
		// no commands but part of a previous package, so... 
		// Try to read the command name then try parse the complete command with args. 
		// If it's ok, execute it.
		// If any of this attempts fail, there is nothing else we could do until we have more data.
		while (mdata)
		{	
			log.write(function(){ return "MemcachedTCPDataHandler.process: (undefined command): " + util.inspect(mdata)}, 3);
			
			var command = (new cmd.MemcachedCommandList()).getCommand(mdata);
			if (!command) break; 
			log.write(function(){ return "MemcachedTCPDataHandler.process: (command defined): " + util.inspect(command, true, 5, true)}, 3);

			var parsed = command.tryParseData(mdata.data);
			if (!parsed) break;
			log.write(function(){ return "MemcachedTCPDataHandler.process: (command data parsed): " + util.inspect(command)}, 3);
							
			var partialResult = command.processData(memcached);
			log.write(function(){ return "MemcachedTCPDataHandler.process: (command data processed): " + util.inspect(partialResult)}, 2);

			// send multiple results on the same response
			result = result ? Buffer.concat([result, partialResult]) : partialResult;
			
			mdata = this.getNextMemcachedData(command, mdata);
		}
		
		this.mdata = mdata;
		result = result || "";
		this.memcached.stats.bytes_written += result.length;
		log.write(function(){ return "MemcachedTCPDataHandler.process: " + util.inspect(result, true, 5, true)}, 3);
		callback(result);
	};

	this.getNextMemcachedData = function (command, mdata) {
		var result = null;
		// if there is more data from buffer, keep it and discard 
		// what has already been processed 
		if (command.rawCommandLength != mdata.data.length) {
			try{
				var b = new Buffer(mdata.data.length - command.rawCommandLength);
				var commandLength = command.rawCommandLength;
				mdata.data.copy(b, 0, commandLength);
				result = new MemcachedData(b);
			} catch(err) {
				// catch weird error "throw new Error('sourceEnd < sourceStart');"
				// somehow the client don't send enough data on the package. 
				// if it happens, its probably a problem on string encoding
				console.log("err: " + err);
				console.log("commandName: " + command.commandName);
				console.log("command.rawCommandLength: " + command.rawCommandLength);
				console.log("mdata.data.length: " + mdata.data.length);
				console.log("mdata.data: " + util.inspect(mdata.data));
				console.log("command: " + util.inspect(command));
				throw err;
			}
			
		}
		result = null;
		log.write(function(){ return "MemcachedTCPDataHandler.getNextMemcachedData: result: " + util.inspect(result)}, 2);
		return result;
	}
};

function Memcached (maxCacheSize) {

	this.version = "0.0.4-js";

 	this.cache = new cache.MemcachedCache(maxCacheSize * 1048576); //size -> Mb to bytes
	
	this.stats = new MemcachedStatistics(this);

	console.log("memcached.js - v" + this.version + "\r\n");
};

exports.Memcached = Memcached;
exports.MemcachedTCPDataHandler = MemcachedTCPDataHandler;