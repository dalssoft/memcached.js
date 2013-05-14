# (without --prof, --debug or -verbose)
# ruby test/from_clients/perf_test.rb > test/perf_test/memcached.{xyz}.txt

require 'rubygems'
require 'memcache'

memcache = MemCache.new('localhost:11211')

n = 800
value = ""
(1048000).times do |x| value << ('.') end
#(10480).times do |x| value << ('.') end

n.times do |x|

  key = "big_" + x.to_s
  
  #puts key, value.length
  memcache.set key, value, 100000
  
  if x % 20 == 0
    start = Time.now
    
    key_test = "smail_" + x.to_s
    value_test = "small value"
    memcache.set key_test, value_test, 100000
    memcache.get key_test
    
    elapsed = Time.now - start
    puts "#{x}|#{elapsed}"
    #puts key_test, value_test.length
  end
  
  #result1 = memcache.get key
  #puts "Erro!" if result1[0] != value

end