module.exports = {
  apps: [{
    name: 'alliance-bot',
    script: '/opt/discord-bot/dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    cwd: '/opt/discord-bot',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/opt/discord-bot/logs/err.log',
    out_file: '/opt/discord-bot/logs/out.log',
    log_file: '/opt/discord-bot/logs/combined.log',
    time: true
  }]
}; 