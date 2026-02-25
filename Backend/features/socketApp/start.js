// Entry point to integrate SocketApp with main backend
// Usage: require and start this from your main index.js

const { server } = require('./socketApp');

const PORT = process.env.SOCKET_PORT || 3001;
server.listen(PORT, () => {
  console.log(`SocketApp: Socket.io server running on port ${PORT}`);
});
