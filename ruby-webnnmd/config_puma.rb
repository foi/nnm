#!/usr/bin/env puma

directory '/samba/public/nnm/ruby-webnnmd/'
daemonize true
pidfile '/samba/public/nnm/ruby-webnnmd/puma.pid'
stdout_redirect '/samba/public/nnm/ruby-webnnmd/log.out', '/samba/public/nnm/ruby-webnnmd/log.error', true
environment 'production'
bind 'tcp://0.0.0.0:80'