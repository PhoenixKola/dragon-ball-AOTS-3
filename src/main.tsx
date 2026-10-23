import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { Session } from './app/session';
import './app/styles.css';

const root = document.getElementById('root')!;
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// start after React has mounted #game-root; StrictMode double-render never creates a second game
let started = false;
const boot = (tries = 0) => {
  if (started) return;
  const host = document.getElementById('game-root');
  if (!host) {
    if (tries > 200) throw new Error('#game-root missing');
    requestAnimationFrame(() => boot(tries + 1));
    return;
  }
  started = true;
  const session = new Session();
  session.start(host).catch((e) => {
    console.error(e);
    document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f88;padding:1rem">Startup failed: ${String(e)}</pre>`);
  });
};
requestAnimationFrame(() => boot());
