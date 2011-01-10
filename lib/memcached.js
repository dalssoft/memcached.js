/*
 * Memcached.Js
 * 
 * Protocol: http://code.sixapart.com/svn/memcached/trunk/server/doc/protocol.txt
 */

var util = require('util');
var log = require('./memcached.log.js');
var cmd = require('./memcached.commands.js');
var cache = require('./memcached.cache.js');

function MemcachedStatistics (memcached)
{
	this._memcached = memcached;
	
	this.version = this._memcached.version;
	this.cmd_get = 0;
	this.cmd_set = 0;
	this.cmd_flush = 0;
	this.get_hits = 0;
	this.get_misses = 0;
	this.bytes = function() { return this._memcached.cache.getByteSize(); };
	this.bytes_read = 0;
	this.bytes_written = 0;
	this.evictions = function() { return this._memcached.cache.getEvictions(); };
	this.curr_items = function() { return this._memcached.cache.getLength(); };
	this.total_items = 0;

}

function MemcachedData (data)
{
	MemcachedData.PROTOCOL_BINARY = 0;
	MemcachedData.PROTOCOL_ASCII = 1;

	// only deals with Ascii for this version
	this.protocol = MemcachedData.PROTOCOL_ASCII;
	this.data = data.toString(); //it won't work for binary protocol
	this.rawData = data; 
	this.length = data.length; 
	
	this.addData = function (data) {
		var rawData = this.rawData;
		var newData = new Buffer(rawData.length + data.length);
		rawData.copy(newData, 0);
		data.copy(newData, rawData.length);
		this.rawData = newData;
		this.data = newData.toString();
		log.write(function(){ return "MemcachedData.addData!"; }, 3);
	}
	
}

function MemcachedTCPDataHandler (memcached) {
	
	this.memcached = memcached; 
	this.mdata = null;
	
	this.process = function (data, callback) {
		
		this.memcached.stats.bytes_read += data.length;
		
		if (!this.mdata) 
			this.mdata = new MemcachedData(data); 
		else
			this.mdata.addData(data);
			
		var mdata = this.mdata;
		
		var result = "";
		// The data from socket can have one command, many commands or 
		// no commands but part of a previous package, so... 
		// Try read the command name then try parse the complete command with args. 
		// If it's ok, execute it.
		// If any of this attempts fail, there is nothing else we could do until we have more data.
		while (mdata)
		{
			var commandName = cmd.MemcachedCommand.tryReadCommand(mdata);
			if (!commandName) break; 
			
			var command = (new cmd.MemcachedCommandList()).getCommand(commandName);
			if (!command) break; 
			
			var parsed = command.tryParseData(mdata);
			if (!parsed) break;
							
			// send multiple results on the same response
			result += command.processData(memcached);
			
			// if there is more data from buffer, keep it and discard 
			// what has already been processed 
			if (command.rawCommandLength != mdata.data.length) {
				var b = new Buffer(mdata.rawData.length - command.rawCommandLength);
				mdata.rawData.copy(b, 0, command.rawCommandLength)
				mdata = new MemcachedData(b);
			} else {
				mdata = null;
			}
		}
		
		this.mdata = mdata;
		this.memcached.stats.bytes_written += data.length;
		log.write(function(){ return "MemcachedTCPDataHandler.process: " + util.inspect(result, true, 5, true)}, 3);
		callback(result);
	};
};

function Memcached (maxCacheSize) {

	this.version = "0.0.1-js";

 	this.cache = new cache.MemcachedCache(maxCacheSize * 1048576); //size -> Mb to bytes
	
	this.stats = new MemcachedStatistics(this);

	console.log("memcached.js - v" + this.version + "\r\n");
};

exports.Memcached = Memcached;
exports.MemcachedTCPDataHandler = MemcachedTCPDataHandler;