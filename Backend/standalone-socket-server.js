// Standalone socket server for testing live folder sync
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve the test HTML file
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Live Folder Sync Test</title>
    </head>
    <body>
      <h1>Live Folder Sync Test</h1>
      <div id="status">Connecting...</div>
      <div>
        <input type="text" id="projectIdInput" placeholder="Enter Project ID" value="test123" />
        <button onclick="subscribeToProject()">Subscribe to Project</button>
      </div>
      <div id="events" style="margin-top: 20px; max-height: 400px; overflow-y: auto;"></div>

      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io('http://localhost:3003');
        const statusDiv = document.getElementById('status');
        const eventsDiv = document.getElementById('events');

        socket.on('connect', () => {
          statusDiv.textContent = 'Connected to Socket.io server';
          statusDiv.style.color = 'green';
          console.log('Connected to Socket.io server');
        });

        socket.on('disconnect', () => {
          statusDiv.textContent = 'Disconnected from Socket.io server';
          statusDiv.style.color = 'red';
          console.log('Disconnected from Socket.io server');
        });

        // Listen for folder sync events
        socket.on('folder_sync', (eventInfo) => {
          console.log('Folder sync event:', eventInfo);
          const eventDiv = document.createElement('div');
          eventDiv.innerHTML = \`
            <strong>\${eventInfo.timestamp}</strong> - 
            Project: \${eventInfo.projectName} (\${eventInfo.projectId}) - 
            <em>\${eventInfo.actionType}</em>: \${eventInfo.folderOrFileName}
          \`;
          eventDiv.style.margin = '5px 0';
          eventDiv.style.padding = '5px';
          eventDiv.style.backgroundColor = eventInfo.actionType.includes('added') ? '#d4edda' : '#f8d7da';
          eventDiv.style.border = '1px solid #ccc';
          eventDiv.style.borderRadius = '3px';
          eventsDiv.insertBefore(eventDiv, eventsDiv.firstChild);
          
          // Keep only last 10 events
          while (eventsDiv.children.length > 10) {
            eventsDiv.removeChild(eventsDiv.lastChild);
          }
        });

        function subscribeToProject() {
          const projectId = document.getElementById('projectIdInput').value;
          if (projectId) {
            socket.emit('subscribe_project', projectId);
            console.log('Subscribed to project:', projectId);
            statusDiv.textContent = \`Connected - Watching project: \${projectId}\`;
            statusDiv.style.color = 'blue';
          }
        }
        
        // Auto-subscribe on page load for testing
        setTimeout(() => {
          subscribeToProject();
        }, 1000);
      </script>
    </body>
    </html>
  `);
});

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  socket.on('subscribe_project', (projectId) => {
    console.log(`✅ Client subscribed to project: ${projectId}`);
    
    // Simulate folder events every 5 seconds for testing
    const interval = setInterval(() => {
      const testEvent = {
        projectId,
        projectName: 'Test Project ' + projectId,
        actionType: Math.random() > 0.5 ? 'folder added' : 'folder removed',
        folderOrFileName: 'TestFolder_' + Date.now(),
        timestamp: new Date().toTimeString().split(' ')[0]
      };
      
      socket.emit('folder_sync', testEvent);
      console.log('📡 Sent test event:', testEvent);
    }, 5000);

    socket.on('disconnect', () => {
      clearInterval(interval);
      console.log('❌ Client disconnected:', socket.id);
    });
  });
});

const PORT = 3003;
server.listen(PORT, () => {
  console.log(`✅ Standalone socket server running on http://localhost:${PORT}`);
  console.log(`Open: http://localhost:${PORT} to test`);
});
