# encoding: utf-8
# How to run:
#     rvm 1.9.2
#     gem install Ruby-MemCache
#     ruby test/from_clients/ruby_client_test.rb
#
#     ps: it is not working with memcached-client
#
require 'rubygems'
require 'benchmark'
require 'memcache'

Benchmark.bm do |x|
  
  memcache = nil
  n = 300
  timeout = 10
  x.report("start server")   {
    memcache = MemCache.new('localhost:11211')
  }

  x.report("basic get and set")   {
    memcache.set "a", "Test Data Ruby", timeout

    memcache.get "a"
    
    memcache.set "b", "Test Data Ruby\r\nWith two lines", timeout

    memcache.get "b"
  }
  
  x.report("basic get and set - with check")   {

    data1 = "Test Data Ruby"
    memcache.set "awc", data1, timeout
    exp_data1 = memcache.get "awc"
    throw "Test 1 - not the equal '#{data1}' and '#{exp_data1[0]}'" if data1 != exp_data1[0]
    
    data2 = "Test Data Ruby\r\nWith two lines"
    memcache.set "bwc", data2, timeout
    exp_data2 = memcache.get "bwc"
    throw "Test 2 - not the equal '#{data2}' and '#{exp_data2[0]}'" if data2 != exp_data2[0]

    key3 = "dç\u0010\u0010X\u0010\u0020\u0030\u0110\u0120\u0130"
    data3 = "Test Data Ruby\r\nWith 3\r\nlines and UTF key"
    memcache.set key3, data3, timeout
    exp_data3 = memcache.get key3
    throw "Test 3 - not the equal '#{data3}' and '#{exp_data3[0]}'" if data3 != exp_data3[0]

    key4 = "ewc"
    data4 = "Test Data Ruby\r\nWith 3\r\nlines and UTF value: \u0010\u0020\u0030\u0010\u0010\u0010\u0010\u0010\u0010\u0010\u00104Utup8qCEj\u00104"
    memcache.set key4, data4, timeout
    exp_data4 = memcache.get key4
    throw "Test 4 - not the equal '#{data4}' and '#{exp_data4[0]}'" if data4 != exp_data4[0]

    data5 = "Test Data Ruby without timeout"
    memcache.set "fwc", data5
    exp_data5 = memcache.get "fwc"
    throw "Test 5 - not the equal '#{data5}' and '#{exp_data5[0]}'" if data5 != exp_data5[0]

  }

  x.report("basic get and add")   {
    memcache.add "aa", "Test Data Ruby", timeout

    memcache.get "aa"
    
    memcache.add "aa", "Test Data Ruby2", timeout

    memcache.get "aa"
  }
  
  x.report("basic get and add - with check")   {

    data1 = "Test Data Ruby"
    memcache.add "awc", data1, timeout
    exp_data1 = memcache.get "awc"
    throw "Test 1 - not the equal '#{data1}' and '#{exp_data1[0]}'" if data1 != exp_data1[0]
    
    data2 = "Test Data Ruby 2"
    memcache.add "awc", data2, timeout
    exp_data2 = memcache.get "awc"
    throw "Test 2 - not the equal '#{data1}' and '#{exp_data2[0]}'" if data1 != exp_data2[0]

    data3 = "Test Data Ruby without timeout"
    memcache.add "fwc", data3
    exp_data3 = memcache.get "fwc"
    throw "Test 3 - not the equal '#{data3}' and '#{exp_data3[0]}'" if data3 != exp_data3[0]

    data4 = "Test Data Ruby without timeout 2"
    memcache.add "fwc", data4
    exp_data4 = memcache.get "fwc"
    throw "Test 4 - not the equal '#{data3}' and '#{exp_data4[0]}'" if data3 != exp_data4[0]

  }

  x.report("basic get and replace")   {
    memcache.replace "r", "Test Data Ruby", timeout

    memcache.get "r"
    
    memcache.set "r", "Test Data Ruby", timeout
    
    memcache.replace "r", "Test Data Ruby2", timeout

    memcache.get "r"
  }

  x.report("basic get and replace - with check")   {
    data1 = "Test Data Ruby"
    memcache.replace "rwc", data1, timeout
    exp_data1 = memcache.get "rwc"
    throw "Test 1 - not blank '#{exp_data1[0]}'" if not exp_data1[0].nil?

    memcache.set "rwc", data1, timeout
    data2 = "Test Data Ruby 2"
    memcache.replace "rwc", data2, timeout
    exp_data2 = memcache.get "rwc"
    throw "Test 2 - not the equal '#{data2}' and '#{exp_data2[0]}'" if data2 != exp_data2[0]
  }

  x.report("basic multi get")   {
    
    keys = ["b_1", "b_2", "b_3"]
    values = ["values 1", "value XYZ", "value 765"]
    (500).times do |x| values[1] << ('|' + x.to_s) end 
    3.times do |x|
      memcache.set keys[x], values[x], timeout
    end
    
    ret_value = memcache.get keys[0], keys[1], keys[2]
    3.times do |x|
      puts "Erro!" if ret_value[x] != values[x]
    end
  
  }
  
  x.report("basic set and delete")   {
    
    value = "Test Data Ruby"
    
    memcache.set "c", value, timeout

    result1 = memcache.get "c"
    
    memcache.delete "c"
    
    result2 = memcache.get "c"
    
    puts "Erro!" if result1[0] != value
    puts "Erro!" if result2[0] != nil
  }

  x.report("n times get and set")   {
    n.times do |x|
  
      key = "a_" + x.to_s
      value = "Test Data Ruby" + x.to_s
  
      memcache.set key, value, timeout

      ret_value = memcache.get key
  
      puts "Erro!" if ret_value[0] != value
  
    end
  }
  
  x.report("n times get without delay")   {
    n.times do |x|
  
      key = "a_" + x.to_s
  
      ret_value = memcache.get key
  
    end
  }
  
  x.report("n times get with delay")   {
    n.times do |x|
  
      key = "a_" + x.to_s
  
      ret_value = memcache.get key
  
      sleep(5/n)
  
    end
  }

  value = ""
  (1024 * 5).times do |x| value << ('|' + x.to_s) end
      
  x.report("n times set and get with big data")   {

    n.times do |x|
  
      key = "big_" + x.to_s
      
      #puts key
      memcache.set key, value, timeout
      
      ret_value = memcache.get key
      
      puts "Erro!" + key if ret_value[0] != value
  
    end
  }
  
end