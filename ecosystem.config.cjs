module.exports = {
  apps : [{
    name   : "simet-api",
    script : "./src/index.js",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
}