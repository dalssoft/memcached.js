var util = require('util');
var log = require('./memcached.log.js');
var dll = require('./doublylinkedlist.js');


function MemcachedCacheItem (key) {
	this.key = key;
	this.flags = 0;
	this.cas = "";
	this.data = new Buffer(0);
	this.expirationTime = 0;
	this.expirationDate = new Date();
	
	this.next = null;
	this.prev = null;
	
	this.isExpired = function () {
		var result = (this.expirationDate < new Date()); 
		log.write(function(){ return "MemcachedCacheItem.isExpired: " + result + " [expirationTime:" + this.expirationTime + ", expirationDate:" + new Date(this.expirationDate) + ", now:" + new Date() + "]"}, 3);
		return result;
	};
}

function MemcachedCache (maxCacheSize) {

	this._cache = new dll.DoublyLinkedList();
	this._size = 0;
	this._evictions = 0;
	
	this.maxCacheSize = maxCacheSize;

	this._tryCleanLastExpiredItems = function (dataSize) {

		if (this._size + dataSize > this.maxCacheSize) {
			var magicNumber = 50;
			var last_item = this._cache.getTail();
			for(var i = 0; i < magicNumber; ++i) {
				if (!last_item) break;
			
				if (last_item.isExpired()) {
					this._cache.remove(last_item.key);
					this._size -= last_item.data.length;
				}
				last_item = last_item.prev;
			}
		}
		
	}

	this._evictionsIfNeeded = function (dataSize) {
		
		this._tryCleanLastExpiredItems(dataSize);
		
		while (this._size + dataSize > this.maxCacheSize) {
			var last_item = this._cache.getTail();
			if (!last_item) break;
			
			if (!last_item.isExpired()) this._evictions++;
			
			this._cache.remove(last_item.key);
			this._size -= last_item.data.length;
			
			log.write(function(){ return "MemcachedCache._evictionsIfNeeded: [Key:" + last_item.key + ", Data Length:" + last_item.data.length + ", isExpired:" + last_item.isExpired() + "]"}, 3);
		};
	};

	this.setItem = function (key, data, exptime, flags) {
		
		this._evictionsIfNeeded(data.length);
		
		var cache_item = this._cache.item(key);
		
		if (!cache_item) {
			var cache_item = new MemcachedCacheItem(key);
			this._cache.addOnTop(cache_item);
		} 
		
		this._size -= cache_item.data.length;
		this._size += data.length;
		
		cache_item.flags = flags; 
		cache_item.cas = "";
		cache_item.data = data;
		cache_item.expirationTime = exptime;
		var now = new Date();
		if (exptime != 0)
			cache_item.expirationDate = now.setSeconds(now.getSeconds() + parseInt(exptime));
		else
			cache_item.expirationDate = new Date(999999999999999); // Do not expire (at least not until Fri, 27 Sep 33.658)
		
		log.write(function(){ return "MemcachedCache.setItem: [key: " + key + " ]:" + util.inspect(cache_item, true, 1, true)}, 3);
	};
	
	this.addItem = function (key, data, exptime, flags) {
		
		var result = false;
		
		var cache_item = this._cache.item(key);
		
		if (!cache_item)
		{
			this._evictionsIfNeeded(data.length);

			this._size += data.length;
		
			cache_item = new MemcachedCacheItem(key);
			var now = new Date();
			cache_item.flags = flags; 
			cache_item.cas = "";
			cache_item.data = data;
			cache_item.expirationTime = exptime;
			cache_item.expirationDate = now.setSeconds(now.getSeconds() + parseInt(exptime));
			this._cache.addOnTop(cache_item);
			result = true;
		}
		
		log.write(function(){ return "MemcachedCache.addItem: [key: " + key + " ]:" + util.inspect(cache_item, true, 1, true)}, 3);
		return result;
	};
	
	this.replaceItem = function (key, data, exptime, flags) {
		
		var result = false;
		
		var cache_item = this._cache.item(key);
		
		if (cache_item)
		{
			this._evictionsIfNeeded(data.length);
		
			this._size -= cache_item.data.length;
			this._size += data.length;
			
			var now = new Date();
			cache_item.flags = flags; 
			cache_item.cas = "";
			cache_item.data = data;
			cache_item.expirationTime = exptime;
			cache_item.expirationDate = now.setSeconds(now.getSeconds() + parseInt(exptime));
			this._cache.moveToTop(cache_item);
			result = true;
		}
		
		log.write(function(){ return "MemcachedCache.addItem: [key: " + key + " ]:" + util.inspect(cache_item, true, 1, true)}, 3);
		return result;
	};
	
	this.getItem = function (key) {
		
		var cache_item = this._cache.item(key);
	
		// LRU: move the least recent item to the top of the list.
		if (cache_item) this._cache.moveToTop(key);
		
		if(cache_item && cache_item.isExpired())
		{	
			cache_item = this._cache.remove(key);
			this._size -= cache_item.data.length;
			cache_item = null;
		}
		var result = cache_item;
			
		log.write(function(){ return "MemcachedCache.getItem: [key: " + key + " ]:" + util.inspect(result, true, 1, true)}, 3);
		return result;
		
	};
	
	this.deleteItem = function (key) {
		
		var result = false;
		cache_item = this._cache.remove(key);
		if(cache_item) {
			this._size -= cache_item.data.length;
			result = true;
		}
		log.write(function(){ return "MemcachedCache.delete: [key: " + key + ", deleted:" + result +"]"}, 3);
		return result;
	}
	
	this.flush = function () {
		
		var last_item = this._cache.getTail();
		while (last_item) {
			this._cache.remove(last_item.key);
			this._size -= last_item.data.length;
			last_item = this._cache.getTail();
		};
		
		log.write(function(){ return "MemcachedCache.flush"}, 3);
	}
	
	this.getLength = function () {
		return this._cache.length();
	};
	
	this.getByteSize = function () {
		return this._size;
	};
	
	this.getEvictions = function () {
		return this._evictions; 
	}
};

exports.MemcachedCache = MemcachedCache;