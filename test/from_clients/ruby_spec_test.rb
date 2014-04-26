# -*- encoding : utf-8 -*-
# How to run:
#     rvm 1.9.2
#     gem install rspec
#     gem install memcache-client
#     gem install dalli
#     rspec -fd -c test/from_clients/ruby_spec_test.rb

require 'rubygems'
require 'benchmark'
require 'memcache'
require 'dalli'
require 'rspec'

RSpec.configure do |c|
  # c.filter_run :focus => true
  c.filter_run_excluding :broken => true
end

describe "Memcached.JS" do

  shared_examples_for "any protocol" do

    it "should execute a 'get'" do
      @memcache.get a_small_key
    end

    it "should execute a 'set'" do
      @memcache.set a_small_key, a_small_value
    end

    it "should execute a 'set' and 'get' the same value" do
      key   = a_small_key
      value = a_small_value

      @memcache.set key, value
      ret_value = @memcache.get key

      ret_value.should eq(value)
    end

    it "should execute a 'set' with medium value and 'get' the same value" do
      key   = a_small_key
      value = generate_random_text(1000)

      @memcache.set key, value
      ret_value = @memcache.get key

      ret_value.should eq(value)
    end

    it "should execute a 'set' with binary value and 'get' the same value" do
      key   = a_small_key
      value = {
        bin: "\xE5\xA5\xBD\xEF\xCF\xBF" }

      @memcache.set key, value
      ret_value = @memcache.get key

      ret_value.should eq(value)

    end

    it "should execute a 'set' with complex object value and 'get' the same value" do
      key   = a_small_key
      value = {
        str: generate_random_text(10),
        utf: "\u0101\u1101\u2101",
        int: 2,
        decimal: 3.4,
        array: [1, 2, 3],
        bin1: "\xE5\xA5\xBD\x00",
        bin2: "\xE5\xA5\xBD\xEF\xCF\xBF" }

      @memcache.set key, value
      ret_value = @memcache.get key

      ret_value.should eq(value)

    end

    it "should execute a 'set' with a utf value and 'get' the same value" do
      key   = a_small_key
      value = generate_random_utf_text(100)

      @memcache.set key, value
      ret_value = @memcache.get key

      ret_value.should eq(value)
    end

    it "should execute a 'set' with a multi-line value and 'get' the same value" do
      key   = a_small_key
      value = "#{a_small_value}\r\n#{a_small_value}\n#{a_small_value}\r#{a_small_value}"

      @memcache.set key, value
      ret_value = @memcache.get key

      ret_value.should eq(value)
    end

    it "should execute a 'set' with a multi-line terminator at the end of the value and 'get' the same value" do
      key   = a_small_key
      value = "#{a_small_value}\r\n"

      @memcache.set key, value
      ret_value = @memcache.get key

      ret_value.should eq(value)
    end

    it "should execute a 'set' with a non expired timeout and 'get' the same value" do
      key     = a_small_key
      value   = a_small_value
      timeout = 10

      @memcache.set key, value, timeout
      ret_value = @memcache.get key

      ret_value.should eq(value)
    end

    it "should execute a 'set' with a expired timeout and 'get' no value" do
      key     = a_small_key
      value   = a_small_value
      timeout = 1

      @memcache.set key, value, timeout
      sleep(1.1)
      ret_value = @memcache.get key

      ret_value.should nil
    end

    it "should execute a 'set' with medium value and 'get' the same value" do
      key   = a_small_key
      value = a_medium_value

      @memcache.set key, value
      ret_value = @memcache.get key

      ret_value.should eq(value)
    end

    it "should execute a 'set' with large value and 'get' the same value" do
      key   = a_small_key
      value = a_large_value

      @memcache.set key, value
      ret_value = @memcache.get key

      ret_value.should eq(value)
    end

    it "should execute a 'set' with 1MB value and 'get' the same value" do
      key   = a_small_key
      value = generate_random_text(1048400)

      @memcache.set key, value
      ret_value = @memcache.get key

      ret_value.should eq(value)
    end

    it "should execute a two consecutive 'set' with 1MB value and 'get' the same value" do
      key1   = a_small_key
      value1 = generate_random_text(1048400)
      key2   = a_small_key
      value2 = generate_random_text(1048400)

      @memcache.set key1, value1
      @memcache.set key2, value2
      ret_value1 = @memcache.get key1
      ret_value2 = @memcache.get key2

      ret_value1.should eq(value1)
      ret_value2.should eq(value2)
    end

    it "should execute a 'get' with multi keys" do
      keys = [a_small_key, a_small_key, a_small_key]
      @memcache.get_multi keys
    end

    it "should execute a 'set' on multi keys and 'get' the same value" do
      keys = [a_small_key, a_small_key, a_small_key]
      values = [a_small_value, a_small_value, a_small_value]
      hash = Hash[keys.zip(values)]

      hash.each_key do |key| @memcache.set key, hash[key] end

      ret_value = @memcache.get_multi keys
      0.upto 2 do |x|
        ret_value[keys[x]].should eq(values[x])
      end
    end

    it "should execute a 'set' on multi keys and 'get' the same value plus a missing key" do
      keys = [a_small_key, a_small_key, a_small_key, a_small_key]
      values = [a_small_value, a_small_value, a_small_value]
      hash = Hash[keys.zip(values)]

      hash.each_key do |key|
        @memcache.set key, hash[key] if hash[key]
      end

      ret_value = @memcache.get_multi keys
      0.upto ret_value.length - 1 do |x|
        ret_value[keys[x]].should eq(values[x])
      end
    end

    it "should execute a 'add'" do
      @memcache.add a_small_key, a_small_value
    end

    it "should execute a 'add' and 'get' the same value" do
      key   = a_small_key
      value = a_small_value

      @memcache.add key, value
      ret_value = @memcache.get key

      ret_value.should eq(value)
    end

    it "should execute a 'add' with not expired timeout and 'get' the same value" do
      key     = a_small_key
      value   = a_small_value
      timeout = 10

      @memcache.add key, value, timeout
      ret_value = @memcache.get key

      ret_value.should eq(value)
    end

    it "should execute a 'add' to a pre-existent key and don't get the same value" do
      key = a_small_key
      first_value = a_small_value
      second_value = generate_random_text(300)

      @memcache.set key, first_value

      @memcache.add key, second_value
      ret_value = @memcache.get key

      ret_value.should eq(first_value)
      ret_value.should_not eq(second_value)
    end

    it "should execute a 'replace'" do
      @memcache.replace a_small_key, a_small_value
    end

    it "should execute a 'replace' and 'get' nil" do
      key   = a_small_key
      value = a_small_value

      @memcache.replace key, value
      ret_value = @memcache.get key

      ret_value.should nil
    end

    it "should execute a 'replace' with timeout and 'get' the same value" do
      key = a_small_key
      first_value = a_small_value
      second_value = generate_random_text(300)
      timeout = 10

      @memcache.set key, first_value

      @memcache.replace key, second_value, timeout
      ret_value = @memcache.get key

      ret_value.should_not eq(first_value)
      ret_value.should eq(second_value)
    end

    it "should execute a 'replace' to a pre-existent key and 'get' the same value" do
      key = a_small_key
      first_value = a_small_value
      second_value = generate_random_text(300)

      @memcache.set key, first_value

      @memcache.replace key, second_value
      ret_value = @memcache.get key

      ret_value.should_not eq(first_value)
      ret_value.should eq(second_value)
    end

    it "should execute a 'delete'" do
      @memcache.delete a_small_key
    end

    it "should execute a 'delete' and 'get' nil" do
      key   = a_small_key

      @memcache.delete key
      ret_value = @memcache.get key

      ret_value.should nil
    end

    it "should execute a 'delete' to a pre-existent key and 'get' nil" do
      key = a_small_key
      value = a_small_value

      @memcache.set key, value

      @memcache.delete key
      ret_value = @memcache.get key

      ret_value.should nil
    end

  end



  context "with BINARY protocol" do

    before :each do
      #Dalli.logger.level = Logger::DEBUG
      @memcache = Dalli::Client.new('localhost:11211', :compress => false, :socket_timeout => 60)
    end

    it_behaves_like "any protocol"

    it "should execute a 'flush'" do
      @memcache.flush
    end

    it "should execute a 'set' with a utf key and 'get' the same value" do
      key   = generate_random_utf_text(10)
      value = a_small_value

      @memcache.set key, value
      ret_value = @memcache.get key

      ret_value.should eq(value)
    end

  end

  context "with ASCII protocol" do

    before :each do
      @memcache = MemCache.new 'localhost:11211'
    end

    it_behaves_like "any protocol"

    it "should execute a 'set' with a utf key and 'get' the same value", :broken => true do
      key   = generate_random_utf_text(10)
      value = a_small_value

      @memcache.set key, value
      ret_value = @memcache.get key

      ret_value.should eq(value)
    end

  end

  def a_small_key
    "K_#{generate_random_text 10}"
  end

  def a_small_value
    "V_#{generate_random_text 50}"
  end

  def a_medium_value
    "V_#{generate_random_text 500}"
  end

  def a_large_value
    "V_#{generate_random_text 5000}"
  end

  def generate_random_text (length)
    chars = 'ABCDEFGHJKLMNOPQRSTUVWXYZ23456789'
    text = ''
    length.times { |i| text << chars[rand(chars.length)] }
    text
  end

  def generate_random_utf_text (length)
    chars = "äçèîñ"
    text = ''
    length.times { |i| text << chars[rand(chars.length)] }
    text
  end
end

