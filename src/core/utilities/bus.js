import mitt from 'mitt';

const emitter = mitt();

const bus = {
  on: emitter.on,
  off: emitter.off,
  emit: emitter.emit,
};

bus.$on = bus.on;
bus.$off = bus.off;
bus.$emit = bus.emit;

export default bus;
