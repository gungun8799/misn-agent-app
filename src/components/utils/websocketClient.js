// src/utils/websocketClient.js
const connectWebSocket = (url) => {
    const ws = new WebSocket('ws://${window.location.hostname}:8080/ws');
  
    ws.onopen = () => {
      console.log('WebSocket connection opened');
      ws.send('Hello from client!');
    };
  
    ws.onmessage = (event) => {
      console.log('Received:', event.data);
    };
  
    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
  
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  
    return ws;
  };
  
  export default connectWebSocket;
  