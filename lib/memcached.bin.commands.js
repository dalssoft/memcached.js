"use strict";

var util = require('util');
var log = require('./memcached.log.js');

var MemcachedCommand = function () {};
	MemcachedCommand.prototype.commandName = "";
	MemcachedCommand.prototype.checkCommandOpcode = function (commandOpcode) { return (commandOpcode == this.commandOpcode );};
	MemcachedCommand.prototype.tryParseData = function (memcachedData) {
		this.data = memcachedData;
		var request = new RequestPackage(this.data);
		
		var thisLength = this.data.length
		log.write(function(){ return "MemcachedCommand.tryParseData - isValidRequestPackage: " + request.isValidRequestPackage() 
			+ " getTotalBody:" + request.getTotalBody()
			+ " data.length:" + thisLength}, 3);
		var isOk = request.isValidRequestPackage() && (request.getTotalBody() <= this.data.length);
		log.write(function(){ return "MemcachedCommand.tryParseData: " + isOk}, 3);
		return isOk;
	};

function MemcachedVersionCommand () {
	this.commandOpcode = 0x0B;
	this.commandName = "version";
	this.params = null;
	this.rawCommandLength = 0;
	
	this.tryParseData = function (memcachedData) {
		return true;
	};

	this.processData = function (memcached) {
		
		var value = "1.4.13"

		var response = new ResponsePackage();
		response.setOpcode(this.commandOpcode);
		response.setValue(value);
		
		var result = response.buildResponseBuffer();
		log.write(function(){ return "MemcachedVersionCommand.processData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	};
}; util.inherits(MemcachedVersionCommand, MemcachedCommand);

function MemcachedGetCommand () {
	this.commandOpcode = 0x00;
	this.commandName = "get";
	this.rawCommandLength = 0;
	
	this.processData = function (memcached) {
		
		var request = new RequestPackage(this.data);
		var response = new ResponsePackage();

		var key = request.getKey();
		var cache_result = memcached.cache.getItem(key);

		response.setOpcode(this.commandOpcode);

		if (cache_result != null)
		{
			var flags = new Buffer(4);
			flags.writeInt32BE(cache_result.flags, 0);
			response.setExtra(flags);
			//response.setKey(cache_result.key);
			response.setValue(cache_result.data);

			var cas = new Buffer(8);
			cas.fill(0x00, 0);
			cas.writeInt32BE(1, 4);

			response.setCAS(cas);
			memcached.stats.get_hits++;
		} else {
			memcached.stats.get_misses++;
		}

		var result = response.buildResponseBuffer();
		log.write(function(){ return "MemcachedGetCommand.processData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	};

}; util.inherits(MemcachedGetCommand, MemcachedCommand);


function MemcachedSetCommand () {
	this.commandOpcode = 0x01;
	this.commandName = "set";
	this.rawCommandLength = 0;
	
	this.processData = function (memcached) {
		
		var request = new RequestPackage(this.data);
		var response = new ResponsePackage();

		memcached.stats.cmd_set++;

		response.setOpcode(this.commandOpcode);

		memcached.cache.setItem(
			request.getKey(), 
			request.getValue(), 
			this.getExpTime(request.getExtra()), 
			this.getFlag(request.getExtra()));
		
		memcached.stats.total_items++;
		
		var result = response.buildResponseBuffer();
		log.write(function(){ return "MemcachedSetCommand.processData: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	};

	this.getFlag = function (extra) {
		return extra.readInt32BE(0);
	}

	this.getExpTime = function (extra) {
		return extra.readInt32BE(4);
	}

}; util.inherits(MemcachedSetCommand, MemcachedCommand);



function BinaryPackage() {};
	BinaryPackage.prototype.headerSize = 24;
	BinaryPackage.prototype.getMagicCode   = function() { return this.data.readUInt8(0); };
	BinaryPackage.prototype.getOpcode      = function() { return this.data.readUInt8(1); };
	BinaryPackage.prototype.getKeyLength   = function() { return this.data.readInt16BE(2); };
	BinaryPackage.prototype.getExtraLength = function() { return this.data.readUInt8(4); };
	BinaryPackage.prototype.getTotalBody   = function() { return this.data.readInt32BE(8); };


function RequestPackage(data) {
	this.data = data;

	this.isValidRequestPackage = function() {
		var result;
		result = this.getMagicCode() === 0x80;
		log.write(function(){ return "RequestPackage.isValidRequestPackage: " + result}, 2);
		return result;
	};

	this.getKey = function () {
		var start = this.headerSize + this.getExtraLength();
		var end = start + this.getKeyLength();
		var result = this.data.toString('utf8', start, end);
		log.write(function(){ return "RequestPackage.getKey: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	}

	this.getExtra = function () {
		var start = this.headerSize;
		var end = start + this.getExtraLength();
		var result = this.data.slice(start, end);
		log.write(function(){ return "RequestPackage.getExtra: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	}

	this.getValue = function () {
		var start = this.headerSize + this.getExtraLength() + this.getKeyLength();
		var end = this.headerSize + this.getTotalBody();
		log.write(function(){ return "RequestPackage.getValue: start: " + start + " end: " + end + " this.getKeyLength():" + this.getKeyLength() + " this.getExtraLength():" + this.getExtraLength() + " data.length: " + this.data.length}.bind(this), 3);
		var result = this.data.slice(start, end);
		log.write(function(){ return "RequestPackage.getValue: " + util.inspect(result.toString(), true, 5, true)}, 3);
		return result;
	}

}; util.inherits(RequestPackage, BinaryPackage);


function ResponsePackage() {

	this.setOpcode = function(opcode) {
		this.opcode = opcode;
	};

	this.setExtra = function(extra) {
		this.extra = this.toBuffer(extra);
	};

	this.setKey = function(key) {
		this.key = this.toBuffer(key);
	};

	this.setValue = function(value) {
		this.value = this.toBuffer(value);
	};

	this.setCAS = function(cas) {
		this.cas = this.toBuffer(cas);
	};

	this.calcExtraLength = function() {
		return this.extra ? this.extra.length : 0;
	}

	this.calcValueLength = function() {
		return this.value ? this.value.length : 0;
	}

	this.buildResponseBufferHeader = function () {
		
		var totalBodyLength = this.calcExtraLength() + this.calcValueLength();
		var totalLength = this.headerSize + totalBodyLength;

		var data = new Buffer(totalLength);
		data.fill(0x00, 0, this.headerSize);

		// Response Magic Code
		data.writeUInt8(0x81, 0); 		
		// Opcode				
		data.writeUInt8(this.opcode, 1);
		// Extra Length				
		data.writeUInt8(this.calcExtraLength(), 4);
		// Total Body
		data.writeInt32BE(totalBodyLength, 8);
		// CAS
		if (this.cas) this.cas.copy(data, 16);
		return data;
	}

	this.buildResponseBuffer = function () {
		var data = this.buildResponseBufferHeader();

		var offSet = this.headerSize;
		if (this.extra) {
			this.extra.copy(data, offSet);				// Extra
			offSet += this.extra.length;
		}
		if (this.key) {
			this.key.copy(data, offSet);				// Key
			offSet += this.key.length;
		}
		if (this.value) {
			this.value.copy(data, offSet);				// Value
			offSet += this.value.length;
		}

		log.write(function(){ return "ResponsePackage.buildResponseBuffer: " + util.inspect(data, true, 5, true)}, 3);
		return data;
	}

	this.toBuffer = function (data) {
		var buffer = data;
		if (typeof data == "string") buffer = new Buffer(data);
		return buffer;
	}

}; util.inherits(ResponsePackage, BinaryPackage);

function MemcachedCommandList () {
	
	// command order
	this.commands = [
		new MemcachedGetCommand(),
		new MemcachedSetCommand(),
		new MemcachedVersionCommand()
	];
	
	this.getCommand = function (mdata) {
	
		var result = null;
		var request = new RequestPackage(mdata.data);

		for (var x in this.commands) {
			var command = this.commands[x];
			if (command.checkCommandOpcode(request.getOpcode())) {
				result = command;
				break;
			}
		}
		
		log.write(function(){ return "MemcachedCommandList.getCommand: " + util.inspect(result, true, 5, true)}, 3);
		return result;
	}
}

exports.isBinaryProtocol = function(data) {
	var request = new RequestPackage(data);
	return request.isValidRequestPackage();
};

exports.MemcachedCommandList = MemcachedCommandList;


