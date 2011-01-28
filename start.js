var net = require('net');
var util = require('util');
var mc = require('./lib/memcached.js');
var log = require('./lib/memcached.log.js');
var profiler = require('v8-profiler');

global.memcachedParams = { 
	verboseLevel: 2 // between 0 and 3;
}
var maxCacheSize = 64; // Megabytes
var memcached = new mc.Memcached(maxCacheSize);

var server = net.createServer(function (socket) {

	var dataHandler = new mc.MemcachedTCPDataHandler(memcached);

	socket.on("connect", function () {
		log.write(function(){ return "CLIENT connected"}, 1);
	});

	socket.on("data", function (data) {
		log.write(function(){ return "CLIENT sending data: [" + log.short(data) + "]"}, 1);
		
		dataHandler.process(data, function(result) {
			log.write(function(){ return "CLIENT receving data: [" + log.short(result) + "]"}, 1);
			socket.write(result);
		});
	
	});

	socket.on("end", function () {
		log.write(function(){ return "CLIENT disconnected"}, 1);
	});

	socket.on("timeout", function () {
		log.write(function(){ return "CLIENT timeout"}, 1);
	});

	socket.on("error", function (exception) {
		log.write(function(){ return 'CLIENT error: ' + exception}, 1);
	});

	socket.on("close", function () {
		log.write(function(){ return 'CLIENT closed'}, 1);
	});

});

server.listen(11211, "127.0.0.1");

//process.on('uncaughtException', function (err) { console.log('Caught exception: ' + err); });

//setTimeout(function () { console.log('This will still run.'); }, 500);
