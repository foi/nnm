require "sinatra/base"
require "active_record"
require "mysql2"


require "./webnnmd"

#use ActiveRecord::ConnectionAdapters::ConnectionManagement

map "/public" do
  run Rack::Directory.new("./public")
end

run WebNNMd