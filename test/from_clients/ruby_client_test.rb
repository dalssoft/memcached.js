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
  n = 1000
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
  
  x.report("basic get and add")   {
    memcache.add "aa", "Test Data Ruby", timeout

    memcache.get "aa"
    
    memcache.add "aa", "Test Data Ruby2", timeout

    memcache.get "aa"
  }
  
  x.report("basic get and replace")   {
    memcache.replace "r", "Test Data Ruby", timeout

    memcache.get "r"
    
    memcache.set "r", "Test Data Ruby", timeout
    
    memcache.replace "r", "Test Data Ruby2", timeout

    memcache.get "r"
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
  (1024 * 100).times do |x| value << ('|' + x.to_s) end
      
  x.report("n times set and get with big data")   {

    n.times do |x|
  
      key = "big_" + x.to_s
      
      #puts key
      memcache.set key, value, timeout
      
      #ret_value = [value]
      ret_value = memcache.get key
      
      puts "Erro!" + key if ret_value[0] != value
  
    end
  }
  


end