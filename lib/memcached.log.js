"use strict";

var util = require('util');

function write(func, level) { 
	
	var verboseLevel = global.memcachedParams.log.verboseLevel;
	if (verboseLevel == null) verboseLevel = 1;
	if (level <= verboseLevel) {
		var text = func();
		if (global.memcachedParams.log.highlight(text))
			util.log("--------------------------------------------------------------------");
		else
			util.log("--------");
		util.log(text); 
	}
};

function short(data, length) { 
	
	if(!length) length = 30;
	if (!data) return "";
	var result = data.toString().substring(0, length);
	if (data.length > length) result += "...";
	return result;
};

exports.write = write;
exports.short = short;