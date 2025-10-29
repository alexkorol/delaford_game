import { createApp } from 'vue';
import { plugin as VueTippy } from 'vue-tippy';
import 'tippy.js/dist/tippy.css';

import Delaford from './Delaford.vue';
import Socket from './core/utilities/socket.js';
import { registerGlobalComponents } from './plugins/register-components.js';
import { installStores } from './stores/index.js';

const app = createApp(Delaford);

installStores(app);
registerGlobalComponents(app);

app.use(VueTippy, {
  animation: 'fade',
  inertia: true,
  size: 'small',
  theme: 'translucent',
  arrow: true,
  followCursor: true,
});

if (typeof window !== 'undefined' && 'WebSocket' in window) {
  const wsurl = {
    prod: 'wss://play.delaford.com',
    dev: `ws://${window.location.hostname}:6500`,
  };

  const url = import.meta.env.PROD ? wsurl.prod : wsurl.dev;
  window.ws = new WebSocket(url);
  Socket.ensureListeners();
  Socket.flushQueue();
}

window.addEventListener('beforeunload', () => {
  if (window.ws) {
    window.ws.close();
  }
});

window.focusOnGame = () => {
  const canvas = document.querySelector('canvas#game-map.main-canvas');
  if (canvas) {
    canvas.focus();
  }
};

app.mount('#delaford');
