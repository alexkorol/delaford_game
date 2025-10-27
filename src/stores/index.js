import { createPinia, setActivePinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

export const pinia = createPinia();

pinia.use(piniaPluginPersistedstate);

export const installStores = (app) => {
  app.use(pinia);
  setActivePinia(pinia);
};
