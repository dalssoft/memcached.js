/*
* Code base on node-memcache exemple script
*
*	https://github.com/vanillahsu/node-memcache 
*/
var assert = require('assert');
var sys      = require('sys');
var memcache = require('../../../node-memcache/lib/memcache.js');

function microtime(get_as_float) {  
    var now = new Date().getTime() / 1000;  
    var s = parseInt(now);
    return (get_as_float) ? now : (Math.round((now - s) * 1000) / 1000) + ' ' + s;  
}

var onConnect = function() {
	
	mcClient.set('test1', 'hello \r\n node-memcache', function(response) {
		mcClient.get('test1', function(data) {
			sys.debug(data);
			mcClient.close();
		});
	});

};

var basicGetSetTest = function() {
	var count = 100;
	
	for (var i=0; i<=count; i++) {
		mcClient.set('test' + i, 'hello \r\n node-memcache' + i, function(response) {
			sys.debug('set response:' +  response);
		}, 3);
		mcClient.get('test' + i, function(data) {
			sys.debug('get data:' +  data);
		});
	}
	
	mcClient.close();
};

var benchmark2 = function() {
	var count = 3;
	start = microtime(true);
	var x = 0;
	
	for (var i=0; i<=count; i++) {
		mcClient.set('test' + i, 'hello \r\n node-memcache', function(response) {
			mcClient.get('test' + i, function(data) {
				x += 1;		
				sys.debug(data);
				if (x == count) {
					end = microtime(true);
					sys.debug('total time: ' + (end - start));
				}
			})
		});
	}
	
	mcClient.close();
};

var setKey = function() {
	mcClient.set('test', 'hello \r\n node-memcache', function(response) {
		mcClient.get('test', function(data) {
			sys.debug(data);
			mcClient.close();
		});
	});
};

var version = function() {
	mcClient.version(function(version) {
		sys.debug(version);
		mcClient.close();
	});
};

var incr = function() {
	mcClient.increment('x', 2, function(new_value) {
		sys.debug(new_value);
		mcClient.close();
	});
};

var decr = function() {
	mcClient.decrement('x', 1, function(new_value) {
		sys.debug(new_value);
		mcClient.close();
	});
};

mcClient = new memcache.Client();
mcClient.connect();
mcClient.addHandler(basicGetSetTest);


