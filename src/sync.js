import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { ydoc } from './store.js';

let provider = null;
const listeners = new Set();

function roomName() {
  return localStorage.getItem('hl-room') || 'habitloop-default';
}

export function getRoom() {
  return roomName();
}

export function setRoom(name) {
  if (!name) return;
  localStorage.setItem('hl-room', name);
  // reconnect with new room
  disconnect();
  connect();
}

export function isConnected() {
  return !!provider && provider.connected;
}

export function peerCount() {
  return provider ? provider.peers.size : 0;
}

export function connect() {
  if (provider) return;
  provider = new WebrtcProvider(`habitloop-${roomName()}`, ydoc, {
    signaling: [
      'wss://signaling.yjs.dev',
      'wss://y-webrtc-signaling-eu.herokuapp.com',
      'wss://y-webrtc-signaling-us.herokuapp.com'
    ]
  });
  provider.on('status', ({ connected }) => {
    listeners.forEach((fn) => fn(connected));
  });
  provider.on('peers', () => {
    listeners.forEach((fn) => fn(isConnected()));
  });
}

export function disconnect() {
  if (provider) {
    provider.destroy();
    provider = null;
    listeners.forEach((fn) => fn(false));
  }
}

export function onSyncStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
