<template>
  <div class="party-panel">
    <header class="party-panel__header">
      <span class="party-panel__title">Party</span>
      <span
        v-if="loading && loading.active"
        class="party-panel__status"
      >
        {{ loadingLabel }}
      </span>
    </header>

    <section
      v-if="invites && invites.length"
      class="party-panel__invites"
    >
      <div
        v-for="invite in invites"
        :key="invite.partyId"
        class="party-panel__invite"
      >
        <span class="party-panel__invite-text">
          Invite from {{ invite.invitedBy || 'Unknown' }}
        </span>
        <div class="party-panel__invite-actions">
          <button
            type="button"
            class="party-panel__button party-panel__button--positive"
            @click="$emit('accept-invite', invite)"
          >
            Accept
          </button>
          <button
            type="button"
            class="party-panel__button party-panel__button--negative"
            @click="$emit('decline-invite', invite)"
          >
            Decline
          </button>
        </div>
      </div>
    </section>

    <section
      v-if="statusMessage"
      class="party-panel__status-message"
    >
      {{ statusMessage }}
    </section>

    <section
      v-if="party"
      class="party-panel__body"
    >
      <ul class="party-panel__members">
        <li
          v-for="member in party.members"
          :key="member.uuid"
          class="party-panel__member"
          :class="{
            'party-panel__member--ready': member.ready,
            'party-panel__member--leader': member.uuid === party.leaderId,
          }"
        >
          <span class="party-panel__member-name">{{ member.username }}</span>
          <span class="party-panel__member-status">
            {{ member.ready ? 'Ready' : 'Not ready' }}
          </span>
        </li>
      </ul>

      <div class="party-panel__actions">
        <button
          type="button"
          class="party-panel__button"
          @click="$emit('toggle-ready')"
        >
          {{ isReady ? 'Set not ready' : 'Ready up' }}
        </button>
        <button
          v-if="isLeader"
          type="button"
          class="party-panel__button"
          :disabled="!allReady"
          @click="$emit('start-instance')"
        >
          Start instance
        </button>
        <button
          v-if="isLeader && party.state === 'instance'"
          type="button"
          class="party-panel__button"
          @click="$emit('return-to-town')"
        >
          Return to town
        </button>
        <button
          type="button"
          class="party-panel__button party-panel__button--negative"
          @click="$emit('leave')"
        >
          Leave party
        </button>
      </div>

      <div
        v-if="isLeader"
        class="party-panel__invite-form"
      >
        <input
          v-model="inviteName"
          type="text"
          class="party-panel__input"
          placeholder="Invite player by name"
          @keyup.enter="submitInvite"
        >
        <button
          type="button"
          class="party-panel__button"
          @click="submitInvite"
        >
          Invite
        </button>
      </div>
    </section>

    <section
      v-else
      class="party-panel__empty"
    >
      <p class="party-panel__empty-text">
        No active party.
      </p>
      <button
        type="button"
        class="party-panel__button"
        @click="$emit('create')"
      >
        Create party
      </button>
    </section>
  </div>
</template>

<script>
export default {
  name: 'PartyPanel',
  props: {
    playerId: {
      type: String,
      default: null,
    },
    party: {
      type: Object,
      default: null,
    },
    invites: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Object,
      default: () => ({ active: false, state: null }),
    },
    statusMessage: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      inviteName: '',
    };
  },
  computed: {
    isLeader() {
      return Boolean(this.party && this.party.leaderId === this.playerId);
    },
    isReady() {
      if (!this.party) {
        return false;
      }
      const member = this.party.members.find(m => m.uuid === this.playerId);
      return Boolean(member && member.ready);
    },
    allReady() {
      if (!this.party) {
        return false;
      }
      return this.party.members.length > 0 && this.party.members.every(member => member.ready);
    },
    loadingLabel() {
      if (!this.loading || !this.loading.state) {
        return 'Loading';
      }
      const mapping = {
        'enter-instance': 'Entering instance...',
        idle: 'Idle',
      };
      return mapping[this.loading.state] || 'Loading';
    },
  },
  methods: {
    submitInvite() {
      const candidate = this.inviteName.trim();
      if (!candidate) {
        return;
      }

      this.$emit('invite', { username: candidate });
      this.inviteName = '';
    },
  },
};
</script>

<style scoped>
.party-panel {
  background: rgba(6, 8, 16, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 0.5rem;
  border-radius: 8px;
  color: var(--color-text-primary, #f5f5f5);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.party-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.party-panel__title {
  font-weight: 600;
}

.party-panel__status {
  font-size: 0.75rem;
  color: #ffd27f;
}

.party-panel__invites {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.party-panel__invite {
  background: rgba(18, 20, 32, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.5rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.party-panel__invite-text {
  font-size: 0.8rem;
}

.party-panel__invite-actions {
  display: flex;
  gap: 0.25rem;
}

.party-panel__status-message {
  font-size: 0.75rem;
  color: #ff9f68;
}

.party-panel__body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.party-panel__members {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
}

.party-panel__member {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.35rem;
  background: rgba(14, 16, 26, 0.6);
  border-radius: 4px;
}

.party-panel__member--ready {
  border: 1px solid rgba(108, 211, 128, 0.6);
}

.party-panel__member--leader::before {
  content: '★';
  color: #ffd27f;
  margin-right: 0.25rem;
}

.party-panel__member-name {
  font-weight: 500;
}

.party-panel__member-status {
  font-size: 0.7rem;
  opacity: 0.8;
}

.party-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.party-panel__button {
  background: rgba(48, 86, 136, 0.85);
  color: #f5f5f5;
  border: none;
  padding: 0.35rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.party-panel__button:hover {
  background: rgba(64, 108, 158, 0.95);
}

.party-panel__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.party-panel__button--negative {
  background: rgba(168, 58, 70, 0.85);
}

.party-panel__button--negative:hover {
  background: rgba(184, 72, 84, 0.95);
}

.party-panel__button--positive {
  background: rgba(70, 150, 92, 0.85);
}

.party-panel__button--positive:hover {
  background: rgba(92, 176, 116, 0.95);
}

.party-panel__invite-form {
  display: flex;
  gap: 0.35rem;
}

.party-panel__input {
  flex: 1;
  background: rgba(14, 16, 26, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 0.3rem 0.45rem;
  border-radius: 4px;
  color: inherit;
  font-size: 0.75rem;
}

.party-panel__empty {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.party-panel__empty-text {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.75;
}
</style>
