#!/usr/bin/env puma

directory '/home/foi/nnm/ruby-webnnmd/'
daemonize true
pidfile '/home/foi/nnm/ruby-webnnmd/puma.pid'
stdout_redirect '/home/foi/nnm/ruby-webnnmd/logs/log.out', '/home/foi/nnm/ruby-webnnmd/logs/log.error', true
environment 'production'
bind 'tcp://0.0.0.0:80'
