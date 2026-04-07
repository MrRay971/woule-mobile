module.exports = {
  apps: [{
    name: 'woule-expo',
    script: 'npx',
    args: 'expo start --tunnel --non-interactive',
    env: { CI: '1' },
    watch: false,
    instances: 1,
    exec_mode: 'fork'
  }]
}
