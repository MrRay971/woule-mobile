module.exports = {
  apps: [
    {
      name: 'woule-expo',
      script: 'npx',
      args: 'expo start --lan --port 8081',
      cwd: '/home/user/woule-mobile',
      env: {
        NODE_ENV: 'development',
        CI: '1',
        EXPO_NO_DOTENV: '0',
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: false,
      max_restarts: 1,
    }
  ]
}
