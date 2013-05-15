	______  ___                                        ______        _________  _________________
	___   |/  /_____ _______ ___ _____________ ___________  /_ _____ ______  /  ______  /__  ___/
	__  /|_/ / _  _ \__  __ `__ \_  ___/_  __ `/_  ___/__  __ \_  _ \_  __  /   ___ _  / _____ \
	_  /  / /  /  __/_  / / / / // /__  / /_/ / / /__  _  / / //  __// /_/ /___ / /_/ /  ____/ /
	/_/  /_/   \___/ /_/ /_/ /_/ \___/  \__,_/  \___/  /_/ /_/ \___/ \__,_/ _(_)\____/   /____/


# Memcached.js
Memcached.js is a port of [Memcached](http://memcached.org/) to Javascript, running on Node.Js.

## Install

	git clone git://github.com/dalssoft/memcached.js.git
	cd memcached.js
	node start.js

## What does it do?

From the original project:

"Free & open source, high-performance, distributed memory object caching system, generic in nature, but intended for use in speeding up dynamic web applications by alleviating database load.

Memcached is an in-memory key-value store for small chunks of arbitrary data (strings, objects) from results of database calls, API calls, or page rendering."

This version:

* Non blocking operations: "take near constant time to execute, no matter how much data is in the cache."
	* Well, not completely true: adding and removing items to cache allocate memory dynamically, because it doesn't allocate memory upfront when the server starts. So, it may take sometime allocating memory. We will fix it in the future, but for now, it probably won't hurt you.
	* On the other hand, the cache operates on algorithms with O(1) complexity. No complex timers / triggers. Just a hash and linked list.
	* And of course, it uses the non-blocking event machine provided by Node.js
* Supported commands on this version: get, set, flush_all, delete, add, replace, stats
* ASCII and (Alpha) Binary memcached protocol


## What it doesn't do?

* It is not a client for memcached
* UDP protocol
* cas, gets, append, prepend, version, quit, incr and decr commands
* delete queue
* stats command with params
* Pre-allocate memory or pagination
* Sophisticated cache strategies. All it does right now is the the old and good LRU, for all items. No discrimination.
	* However, now it uses the same heuristic that the original project uses to clean expired items when it needs more space.


## 	When Memory Is Reclaimed
Memory for an item is not actively reclaimed. If you store an item and it expires, it sits in the LRU cache at its position until it falls to the end and is reused.

However, if you fetch an expired item, memcached.js will find the item, notice that it's expired, and free its memory. This gives you the common case of normal cache churn reusing its own memory.

Items can also be evicted to make way for new items that need to be stored. But before that, we will try to drop a few expired items at the end of the list.

## Current State
Currently, the project is Alpha (version 0.0.4), not tested in production enviroment. However, it was tested using diferent scenarios and condition, with different clients (see /test/from_clients folder and the list below).

I haven't done any serious performance test, just simple ones. Compared with the original memcached written in C, memcached.js performance is between 30% and 50% slower. The situation may worsen as new functionality is added (currently, it's ~ 1000 of javascript LOC against ~ 7500 of C LOC, according to [CLOC](http://sourceforge.net/projects/cloc/)). At the same time, it can be improved since no optimization has been done yet and I can see many places where it could do better.

Tested on Node.js since version v0.3.6-pre. Last check: Node.js v0.10.5

Clients tested:

C/C++:
- [memcslap](https://code.launchpad.net/libmemcached)

Ruby:

- [Ruby MemCache Client](http://deveiate.org/projects/RMemCache/)

- [memcache-client](http://rubygems.org/gems/memcache-client/versions/1.8.5)

Node.js:

- [node-memcache](https://github.com/vanillahsu/node-memcache)

Perl:

- [damemtop](https://github.com/dormando/damemtop)

- [memcache-top](http://code.google.com/p/memcache-top/)


## Using Memcached.js

	cd memcached.js
	node start.js

On the client side:

	telnet localhost 11211
	stats

Test:

    rspec -fd -c test/from_clients/ruby_spec_test.rb

## Implemented commands

              ASCII    Bin
    Get         X       X
    Set         X       X
    Add         X       X
    Replace     X       X
    Delete      X
    Increment
    Decrement
    Quit
    Flush
    GetQ
    No-op
    Version
    GetK
    GetKQ               X
    Append
    Prepend
    Stat        X
    SetQ
    AddQ
    ReplaceQ
    DeleteQ
    IncrementQ
    DecrementQ
    QuitQ
    FlushQ
    AppendQ
    PrependQ