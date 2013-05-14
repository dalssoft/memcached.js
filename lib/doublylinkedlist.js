/*
 * Doubly Linked List 
 * based on the code by Nicholas C. Zakas
 * https://github.com/nzakas/computer-science-in-javascript/tree/master/data-structures/doubly-linked-list
 */
 
/**
 * A linked list implementation in JavaScript.
 * @class DoublyLinkedList
 * @constructor
 */

"use strict";

var util = require('util');

function DoublyLinkedList () {

    /**
     * Pointer to first item in the list.
     * @property _head
     * @type Object
     * @private
     */
    this._head = null;
    
    /**
     * Pointer to last item in the list.
     * @property _tail
     * @type Object
     * @private
     */    
    this._tail = null;
    
    /**
     * The number of items in the list.
     * @property _length
     * @type int
     * @private
     */    
    this._length = 0;

	this._hash = new Object();
}

DoublyLinkedList.prototype = {

    //restore constructor
    constructor: DoublyLinkedList,    
    
    add: function (node){
    
        //create a new item object, place data in
        /*
		var node = { 
                data: data, 
				key: ""
                next: null,
                prev: null
            };
    	*/
		
		node.prev = null;
		node.next = null;
		
        //special case: no items in the list yet
        if (this._length == 0) {
            this._head = node;
            this._tail = node;
        } else {
        
            //attach to the tail node
            this._tail.next = node;
            node.prev = this._tail;
            this._tail = node;
        }        
        
        //don't forget to update the count
        this._length++;
    
		this._hash[node.key] = node;

    },

	addOnTop: function (node){
    
        //create a new item object, place data in
        /*
		var node = { 
                data: data, 
				key: ""
                next: null,
                prev: null
            };
    	*/

		node.prev = null;
		node.next = null;

        //special case: no items in the list yet
        if (this._length == 0) {
            this._head = node;
            this._tail = node;
        } else {
        
            //attach to the head node
            this._head.prev = node;
            node.next = this._head;
            this._head = node;
        }        
        
        //don't forget to update the count
        this._length++;
    
		this._hash[node.key] = node;

    },

    /**
     * Retrieves the data in the given position in the list.
     * @param {int} index The zero-based index of the item whose value 
     *      should be returned.
     * @return {variant} The value in the "data" portion of the given item
     *      or null if the item doesn't exist.
     * @method item
     */
    item: function(key){
    
        return this._hash[key];
    },
    
    /**
     * Removes the item from the given location in the list.
     * @param {int} index The zero-based index of the item to remove.
     * @return {variant} The data in the given position in the list or null if
     *      the item doesn't exist.
     * @method remove
     */
    remove: function(key){
    
        var current = this.item(key);

		if (current)
        {        
            //special case: removing first item
            if (this._head === current) {
	
                this._head = current.next;
                
                if (!this._head){
                    this._tail = null;
                } else {
                    this._head.prev = null;
                };
       
            //special case: removing last item
            } else if (this._tail === current) {
                this._tail = current.prev;
                this._tail.next = null;
            } else {
				current.prev.next = current.next;
				current.next.prev = current.prev;
            };

			this._length--;
			delete this._hash[key];
			        
            return current;            
        
        } else {
            return null;
        }
               
    },    

	moveToTop: function(key){
		//lazy programming. TODO: improve this method and sleep more.
		var current = this.remove(key);
		if (current) this.addOnTop(current);
	},
	
   /**
     * Returns the number of items in the list.
     * @return {int} The number of items in the list.
     * @method length
     */
    length: function(){
	
        return this._length;
    },

	getHead: function() {
		return this._head;
	},
	
	getTail: function() {
		return this._tail;
	}
    
};

exports.DoublyLinkedList = DoublyLinkedList;