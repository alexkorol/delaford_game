<template>
  <div class="auth-container">
    <AudioMainMenu />
    <div
      v-if="screen === 'server-down'"
      class="auth-container__panel auth-container__panel--server"
    >
      The game server is down. Please check the website for more information.
    </div>
    <div
      v-else
      class="auth-container__panel"
    >
      <div
        v-if="screen === 'register'"
        class="auth-container__register"
      >
        <p class="auth-container__register-intro">
          To register an account, please visit
          <a href="https://delaford.com/register">this page</a>
          to get started and then come back. Once you have an account ID, reserve your in-world identity below.
        </p>
        <CharacterCreate />
      </div>

      <div
        v-else-if="screen === 'login'"
        class="auth-container__login"
      >
        <img
          class="auth-container__logo"
          src="@/assets/logo.png"
          alt="Logo"
        >
        <Login />
      </div>

      <div v-else>
        <img
          class="auth-container__logo"
          src="@/assets/logo.png"
          alt="Logo"
        >
        <div class="auth-container__button-group">
          <button
            class="auth-container__button auth-container__button--login"
            type="button"
            @click="emitNavigate('login')"
          >
            Login
          </button>
          <button
            class="auth-container__button auth-container__button--register"
            type="button"
            @click="emitNavigate('register')"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AudioMainMenu from '../sub/AudioMainMenu.vue';
import Login from '../ui/Login.vue';
import CharacterCreate from '../ui/auth/CharacterCreate.vue';

export default {
  name: 'AuthContainer',
  components: {
    AudioMainMenu,
    Login,
    CharacterCreate,
  },
  props: {
    screen: {
      type: String,
      default: 'login',
    },
  },
  emits: ['navigate'],
  methods: {
    emitNavigate(target) {
      this.$emit('navigate', target);
    },
  },
};
</script>

<style scoped lang="scss">
@use '@/assets/scss/abstracts/tokens' as *;

.auth-container {
  width: min(720px, 94vw);
  position: relative;
  border: 4px solid rgba(255, 255, 255, 0.12);
  box-sizing: border-box;
  display: flex;
  min-height: 520px;
  margin: auto;
  align-content: center;
  justify-content: center;
  background-image: url('@/assets/bg-screen.png');
  background-size: cover;
  background-position: center;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.55);
  padding: var(--space-lg) var(--space-xl);
}

.auth-container__panel {
  background-color: rgba(0, 0, 0, 0.55);
  padding: var(--space-lg) var(--space-xl);
  display: inline-flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
}

.auth-container__panel--server {
  font-size: 0.85em;
  text-align: center;
}

.auth-container__register-intro {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.85);
  text-align: center;

  a {
    color: #f3b15b;
    text-decoration: underline;
  }
}

.auth-container__logo {
  margin: 0 auto var(--space-md);
}

.auth-container__button-group {
  display: inline-flex;
  justify-content: space-around;
  gap: var(--space-lg);
}

.auth-container__button {
  background: rgba(220, 220, 220, 0.92);
  border: 2px solid rgba(255, 255, 255, 0.18);
  font-size: 1.4rem;
  cursor: pointer;
  padding: var(--space-sm) var(--space-lg);
  color: #020307;
}
</style>
