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
        // Forcer l'host public du sandbox pour que le manifest soit accessible
        REACT_NATIVE_PACKAGER_HOSTNAME: '8081-i8od27u6l47am64mwmde1-82b888ba.sandbox.novita.ai',
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: false,
      max_restarts: 1,
    }
  ]
}
