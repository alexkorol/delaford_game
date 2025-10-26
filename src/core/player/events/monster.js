export default {
  'monster:state': (message, context) => {
    if (!context || typeof context.monsterState !== 'function') {
      return;
    }

    const payload = message && message.data ? message.data : [];
    const meta = message && message.meta ? message.meta : {};
    context.monsterState(payload, meta);
  },
};
