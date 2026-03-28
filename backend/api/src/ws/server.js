import { WebSocketServer } from "ws";

let wss;

export function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws) => {
    console.log("WS client connected");
    ws.on("close", () => console.log("WS client disconnected"));
  });
}

/** Broadcast an event to all connected dashboard clients. */
export function broadcast(event) {
  if (!wss) return;
  const msg = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}
