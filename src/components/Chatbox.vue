<template>
  <section
    class="chatbox"
    :class="chatboxClasses"
    @mouseenter="$emit('hover-state', true)"
    @mouseleave="$emit('hover-state', false)"
    @click.stop="focusInput"
  >
    <header class="chatbox__header">
      <div class="chatbox__meta">
        <h2 class="chatbox__title">Chat</h2>
        <p
          v-if="showCountdown"
          class="chatbox__countdown"
        >
          Hiding in {{ countdownLabel }}
        </p>
      </div>
      <div class="chatbox__actions">
        <span
          v-if="collapsed && unreadCount > 0"
          class="chatbox__badge"
          aria-live="polite"
        >
          {{ unreadCount }}
        </span>
        <button
          class="chatbox__pin"
          type="button"
          @click="$emit('toggle-pin')"
        >
          {{ pinned ? 'Unpin' : 'Pin' }}
        </button>
      </div>
    </header>

    <div
      ref="messageList"
      class="chatbox__messages"
    >
      <ul class="chatbox__list">
        <li
          v-for="(message, index) in messages"
          :key="`${message.timestamp}-${index}`"
          class="chatbox__message"
        >
          <span
            v-if="message.username"
            class="chatbox__username"
          >
            {{ message.username }}:
          </span>
          <span
            class="chatbox__text"
            v-html="message.display"
          />
          <span class="chatbox__time">{{ message.displayTime }}</span>
        </li>
      </ul>
    </div>

    <form
      class="chatbox__form"
      @submit.prevent="sendMessage"
    >
      <input
        ref="input"
        v-model="said"
        class="chatbox__input"
        type="text"
        autocomplete="off"
        maxlength="120"
        placeholder="Say something..."
        @focus="handleFocus"
        @blur="handleBlur"
      >
      <button
        class="chatbox__submit"
        type="submit"
      >
        Send
      </button>
    </form>
  </section>
</template>

<script>
import Socket from '../core/utilities/socket.js';
import bus from '../core/utilities/bus.js';

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const normaliseIncoming = (incoming) => {
  if (Object.hasOwnProperty.call(incoming, 'text')) {
    return incoming;
  }
  if (incoming && incoming.data) {
    if (incoming.data.data) {
      return incoming.data.data;
    }
    return incoming.data;
  }
  return incoming;
};

export default {
  name: 'Chatbox',
  props: {
    game: {
      type: Object,
      required: true,
    },
    layoutMode: {
      type: String,
      default: 'desktop',
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    collapsed: {
      type: Boolean,
      default: false,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    autoHideSeconds: {
      type: Number,
      default: 0,
    },
  },
  emits: ['message-appended', 'toggle-pin', 'hover-state', 'countdown-complete'],
  data() {
    return {
      said: '',
      messages: [
        {
          type: 'normal',
          text: 'Welcome to Delaford.',
          username: '',
          color: '#1D56F2',
          timestamp: Date.now(),
          display: 'Welcome to Delaford.',
          displayTime: formatTime(Date.now()),
        },
      ],
      hasFocus: false,
      countdownRemaining: 0,
      countdownTimer: null,
    };
  },
  computed: {
    chatboxClasses() {
      return [
        `chatbox--${this.layoutMode}`,
        {
          'chatbox--pinned': this.pinned,
          'chatbox--collapsed': this.collapsed,
        },
      ];
    },
    showCountdown() {
      return !this.pinned && !this.collapsed && this.countdownRemaining > 0;
    },
    countdownLabel() {
      return `${this.countdownRemaining}s`;
    },
  },
  watch: {
    collapsed: {
      immediate: true,
      handler(value) {
        if (!value && !this.pinned && this.autoHideSeconds > 0) {
          this.startCountdown();
        } else {
          this.stopCountdown();
        }
      },
    },
    pinned(newValue) {
      if (newValue) {
        this.stopCountdown();
      } else if (!this.collapsed && this.autoHideSeconds > 0) {
        this.startCountdown();
      }
    },
  },
  created() {
    this.messageHandler = (data) => this.pipeline(data);
    bus.$on('player:say', this.messageHandler);
    bus.$on('item:examine', this.messageHandler);
  },
  mounted() {
    this.scrollToBottom();
  },
  beforeDestroy() {
    bus.$off('player:say', this.messageHandler);
    bus.$off('item:examine', this.messageHandler);
    this.stopCountdown();
  },
  methods: {
    pipeline(incoming) {
      const normalised = normaliseIncoming(incoming);
      if (!normalised) {
        return;
      }
      const {
        text = '',
        type = 'normal',
        username = null,
        color = '#1D56F2',
      } = normalised;

      this.said = text;
      this.appendChat({ type, username, color, text });
    },
    appendChat({ type, username, color, text }) {
      if (!text) {
        return;
      }
      const timestamp = Date.now();
      const display = this.formatMessage(type, username, color, text);
      const message = {
        type,
        username,
        color,
        text,
        display,
        timestamp,
        displayTime: formatTime(timestamp),
      };

      this.messages = [...this.messages.slice(-199), message];
      this.$emit('message-appended', { ...message });
      this.$nextTick(() => this.scrollToBottom());
    },
    formatMessage(type, username, color, text) {
      switch (type) {
      case 'chat':
        return `<span class="chatbox__text--chat" style="color:${color}">${text}</span>`;
      default:
        return text;
      }
    },
    sendMessage() {
      const payload = this.said && this.said.trim();
      if (!payload) {
        return;
      }
      const player = this.game && this.game.player;
      if (!player || !player.socket_id) {
        return;
      }
      Socket.emit('player:say', { said: payload, id: player.socket_id });
      this.clearInput();
    },
    clearInput() {
      this.said = '';
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messageList;
        if (!container) {
          return;
        }
        container.scrollTop = container.scrollHeight;
      });
    },
    focusInput() {
      if (this.$refs.input) {
        this.$refs.input.focus();
      }
    },
    handleFocus() {
      this.hasFocus = true;
      this.$emit('hover-state', true);
      this.stopCountdown();
    },
    handleBlur() {
      this.hasFocus = false;
      this.$emit('hover-state', false);
      if (!this.collapsed && !this.pinned && this.autoHideSeconds > 0) {
        this.startCountdown();
      }
    },
    startCountdown() {
      if (this.autoHideSeconds <= 0) {
        this.stopCountdown();
        return;
      }
      this.stopCountdown();
      this.countdownRemaining = this.autoHideSeconds;
      this.countdownTimer = setInterval(() => {
        if (this.countdownRemaining <= 1) {
          this.stopCountdown();
          this.$emit('countdown-complete');
          return;
        }
        this.countdownRemaining -= 1;
      }, 1000);
    },
    stopCountdown() {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
      this.countdownRemaining = 0;
    },
  },
};
</script>

<style lang="scss" scoped>
@use '@/assets/scss/abstracts/tokens' as *;
@use '@/assets/scss/abstracts/breakpoints' as *;
@use '@/assets/scss/abstracts/mixins' as *;

.chatbox {
  position: relative;
  display: flex;
  flex-direction: column;
  width: var(--chat-width);
  max-width: 100%;
  @include glass-panel(rgba(16, 20, 32, 0.78));
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: transform 180ms ease-out, opacity 180ms ease-out;

  &--collapsed {
    pointer-events: none;
    opacity: 0.1;
  }

  &--pinned {
    box-shadow: var(--shadow-strong);
  }

  &--mobile {
    width: 100%;
  }
}

.chatbox__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid var(--color-border-subtle);
}

.chatbox__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chatbox__title {
  margin: 0;
  font-size: var(--font-size-sm);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.chatbox__countdown {
  margin: 0;
  font-size: 0.75em;
  color: var(--color-text-secondary);
}

.chatbox__actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.chatbox__badge {
  min-width: 22px;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--color-accent);
  color: #020307;
  font-size: 0.75em;
  text-align: center;
}

.chatbox__pin {
  appearance: none;
  border: 1px solid var(--color-border-subtle);
  background: rgba(0, 0, 0, 0.35);
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  font-size: var(--font-size-sm);
  cursor: pointer;

  &:hover {
    border-color: var(--color-border-strong);
    background: rgba(0, 0, 0, 0.55);
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent-strong);
    outline-offset: 2px;
  }
}

.chatbox__messages {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  overflow-y: auto;
  max-height: 320px;
  scroll-behavior: smooth;
}

.chatbox__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chatbox__message {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.chatbox__username {
  color: var(--color-accent-strong);
  font-weight: 600;
}

.chatbox__text {
  word-break: break-word;
}

.chatbox__text--chat {
  font-weight: 500;
}

.chatbox__time {
  font-size: 0.7em;
  opacity: 0.6;
}

.chatbox__form {
  display: flex;
  align-items: stretch;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md) var(--space-md);
}

.chatbox__input {
  flex: 1;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-subtle);
  background: rgba(0, 0, 0, 0.45);
  color: var(--color-text-primary);
  padding: 8px;
  font-size: var(--font-size-sm);

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
}

.chatbox__submit {
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-subtle);
  background: var(--color-accent);
  color: #020307;
  padding: 8px 12px;
  font-size: var(--font-size-sm);
  cursor: pointer;
  font-weight: 600;

  &:hover {
    filter: brightness(1.1);
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent-strong);
    outline-offset: 2px;
  }
}

@include media('<=tablet') {
  .chatbox {
    width: min(420px, 96vw);
  }

  .chatbox__messages {
    max-height: 260px;
  }
}

@include media('<=mobile') {
  .chatbox {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    width: 100%;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    box-shadow: 0 -16px 32px rgba(0, 0, 0, 0.55);
    transform: translateY(0);
  }

  .chatbox--collapsed {
    transform: translateY(calc(100% - 60px));
    opacity: 1;
    pointer-events: auto;
  }

  .chatbox__messages {
    max-height: 45vh;
  }
}
</style>
