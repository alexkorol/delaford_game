<template>
  <div class="form">
    <div
      v-tippy
      title="Load pre-made guest account. No progress will be saved on this account."
      class="checkbox guest_account"
    >
      <label for="guest_account">
        <input
          id="guest_account"
          v-model="guestAccount"
          type="checkbox"
          @change="toggleGuestAccount"
        >
        Guest account?
      </label>
    </div>
    <div class="inputs">
      <form
        :class="{ hasErrors: invalid }"
        autocomplete="off"
        @submit.prevent="login"
      >
        <label for="login-username" class="sr-only">Username</label>
        <input
          id="login-username"
          ref="usernameField"
          v-model="username"
          placeholder="Username"
          type="text"
          class="username"
          autocorrect="off"
          spellcheck="false"
          autocomplete="off"
        >
        <label for="login-password" class="sr-only">Password</label>
        <input
          id="login-password"
          v-model="password"
          placeholder="Password"
          type="password"
          class="password"
          autocomplete="off"
        >
      </form>

      <div
        v-if="invalid"
        class="error_message"
      >
        Incorrect login. Please try again.
      </div>
    </div>

    <div class="action_buttons">
      <button
        class="button login"
        @click="login"
      >
        Login
      </button>
      <div
        v-if="inDevelopment"
        v-tippy
        title="Dev account details will be saved and auto-logged in upon code changes."
        class="checkbox"
      >
        <label for="rememberMe">
          <input
            id="rememberMe"
            v-model="rememberMe"
            type="checkbox"
            @change="toggleRememberMe"
          >
          Remember me?
        </label>
      </div>
      <button
        class="button"
        @click="cancel"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

import { useUiStore } from '@/stores/ui.js';

import bus from '../../core/utilities/bus.js';
import Socket from '../../core/utilities/socket.js';

const uiStore = useUiStore();

const invalid = ref(false);
const username = ref('');
const password = ref('');
const guestAccount = ref(false);
const rememberMe = ref(false);
const isLoginInProgress = ref(false);
const usernameField = ref(null);

const inDevelopment = computed(() => !import.meta.env.PROD);

const setLoginProgress = (value) => {
  isLoginInProgress.value = value;
};

const applyGuestCredentials = (value) => {
  if (value) {
    username.value = 'dev';
    password.value = 'qwertykeyboard';
  } else {
    username.value = '';
    password.value = '';
  }
};

watch(
  guestAccount,
  (value) => {
    applyGuestCredentials(value);
  },
  { immediate: false },
);

const toggleGuestAccount = () => {
  uiStore.setGuestAccount(guestAccount.value);
};

const toggleRememberMe = () => {
  uiStore.setRememberMe(rememberMe.value);
  const url = rememberMe.value
    ? `${window.location.origin}/?#autologin`
    : window.location.origin;
  window.history.pushState('Page', 'Title', url);
};

const introduceMusic = () => {
  bus.emit('music:start');
};

const cancel = () => {
  bus.emit('go:main');
};

const incorrectLogin = () => {
  setLoginProgress(false);
  invalid.value = true;
};

const login = () => {
  if (isLoginInProgress.value) return;
  setLoginProgress(true);
  invalid.value = false;
  const data = {
    username: username.value,
    password: password.value,
    useGuestAccount: guestAccount.value,
  };

  uiStore.rememberDevAccount({
    username: username.value,
    password: password.value,
  });
  Socket.emit('player:login', data);
};

const handleLoginError = () => incorrectLogin();
const handleLoginComplete = () => setLoginProgress(false);

onMounted(() => {
  invalid.value = false;

  const tempGuest = window.location.href.includes('?useGuestAccount');

  rememberMe.value = uiStore.rememberMe;
  guestAccount.value = tempGuest || uiStore.guestAccount;

  bus.on('player:login-error', handleLoginError);
  bus.on('login:done', handleLoginComplete);

  if (guestAccount.value && import.meta.env.DEV) {
    applyGuestCredentials(true);
  }

  const storedAccount = uiStore.account;
  if (storedAccount?.username) {
    username.value = storedAccount.username;
    password.value = storedAccount.password;
    if (window.location.href.includes('#autologin')) {
      setTimeout(() => document.querySelector('button.login')?.click(), 250);
    }
  }

  nextTick(() => {
    usernameField.value?.focus();
  });
});

onBeforeUnmount(() => {
  bus.off('player:login-error', handleLoginError);
  bus.off('login:done', handleLoginComplete);
});
</script>

<style lang="scss" scoped>
@use "@/assets/scss/main" as *;

div.form {
  width: 100%;

  form {
    display: flex;
    flex-direction: column;

    input {
      font-size: 15pt;
      outline: none;
      padding: 5px 8px;
      background: transparent;
      border-style: solid;
      color: rgb(192, 192, 83);
      border-color: white;
      border-width: 0 0 2px 0;
      margin-bottom: 1em;
      font-family: "ChatFont", sans-serif;
      text-shadow: 1px 1px 0 #000;

      &:last-child {
        margin-bottom: 0;
      }

      &:focus {
        background: rgba(255, 255, 255, 0.2);
      }
    }
  }

  form.hasErrors {
    input {
      background: rgba(255, 0, 0, 0.5);
      border-bottom-color: rgba(255, 0, 0, 0.7);
    }
  }

  .error_message {
    margin-top: 1em;
    background: #F44336;
    padding: 0.25em 0;
    color: #FAFAFA;
  }

  .action_buttons {
    display: inline-flex;
    width: 100%;
    margin-top: 1em;
    justify-content: space-between;

    button {
      font-size: 1.5em;
    }
  }

  .checkbox {
    background: #b93636;
    border: 2px solid #521414;
    color: #c0c053;
    margin-top: 0.25em;
    padding: 0.25em;
    font-family: "ChatFont", sans-serif;
    text-shadow: 1px 1px 0 #000;
  }

  .guest_account {
    margin-top: 1em;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
}
</style>
