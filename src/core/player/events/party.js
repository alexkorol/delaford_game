import bus from '../../utilities/bus.js';

const safeCall = (context, method, ...args) => {
  if (!context || typeof context[method] !== 'function') {
    return;
  }

  context[method](...args);
};

export default {
  'party:update': (message, context) => {
    const payload = message && message.data ? message.data : {};
    safeCall(context, 'handlePartyUpdate', payload.party || null, payload.meta || {});
  },
  'party:invited': (message, context) => {
    const payload = message && message.data ? message.data : {};
    safeCall(context, 'handlePartyInvite', payload.invite || null);
  },
  'party:error': (message, context) => {
    const payload = message && message.data ? message.data : {};
    if (payload.error && payload.error.message) {
      safeCall(context, 'handlePartyError', payload.error);
      if (!context || typeof context.handlePartyError !== 'function') {
        bus.$emit('game:send:message', payload.error.message);
      }
    }
  },
  'party:loading': (message, context) => {
    const payload = message && message.data ? message.data : {};
    safeCall(context, 'handlePartyLoading', payload.state || null, payload.party || null);
  },
  'party:scene:transition': async (message, context) => {
    const payload = message && message.data ? message.data : {};
    if (!context || typeof context.handlePartySceneTransition !== 'function') {
      return;
    }

    await context.handlePartySceneTransition(payload.scene || null, payload.playerState || {}, payload.party || null);
  },
  'party:instance:complete': (message, context) => {
    const payload = message && message.data ? message.data : {};
    safeCall(context, 'handlePartyInstanceComplete', payload);
  },
};
