group { 'puppet':
  ensure => present
} ->

exec { 'apt-get update':
  command => '/usr/bin/apt-get update',
  timeout => 0
} ->

package { ['python-software-properties']:
  ensure => present
} ->

exec { 'add-repository nodejs':
  command => '/usr/bin/add-apt-repository ppa:chris-lea/node.js',
  unless  => '/usr/bin/apt-key list | grep node'
} ->

exec { 'apt-get update2':
  command => '/usr/bin/apt-get update',
  timeout => 0
} ->

package { ['git', 'nodejs', 'figlet', 'ruby1.9.3', 'build-essential']:
  ensure => present
}