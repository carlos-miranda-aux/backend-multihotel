module.exports = {
  apps : [{
    name   : "simet-api",
    script : "npm",
    args: "run start",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}