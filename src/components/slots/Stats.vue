<template>
  <div class="stats_slot">
    <section class="attributes">
      <header>Attributes</header>
      <ul>
        <li
          v-for="attribute in attributes"
          :key="attribute.id"
        >
          <span class="label">{{ attribute.label }}</span>
          <span class="value">{{ attribute.value }}</span>
          <small class="breakdown">
            <span class="base">B {{ attribute.breakdown.base }}</span>
            <span class="gear">G {{ attribute.breakdown.equipment }}</span>
            <span class="bonus">+ {{ attribute.breakdown.bonuses }}</span>
          </small>
        </li>
      </ul>
    </section>

    <section class="lifecycle">
      <header>Life &amp; Death</header>
      <ul>
        <li>
          <span class="label">State</span>
          <span class="value">{{ lifecycleState }}</span>
        </li>
        <li>
          <span class="label">Deaths</span>
          <span class="value">{{ lifecycle.deaths }}</span>
        </li>
        <li>
          <span class="label">Lives</span>
          <span class="value">{{ lifecycle.livesRemaining }}</span>
        </li>
        <li>
          <span class="label">Cheat Death</span>
          <span class="value">{{ cheatDeathSummary }}</span>
        </li>
        <li>
          <span class="label">Respawn</span>
          <span class="value">{{ respawnSummary }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script>
import { ATTRIBUTE_IDS, ATTRIBUTE_LABELS } from 'shared/stats';

const normaliseNumber = value => (Number.isFinite(value) ? value : 0);

export default {
  props: {
    game: {
      type: Object,
      required: true,
    },
  },
  computed: {
    player() {
      return this.game && this.game.player ? this.game.player : {};
    },
    stats() {
      if (!this.player) {
        return {};
      }

      return this.player.stats || {};
    },
    attributeSources() {
      const sources = this.stats.attributes && this.stats.attributes.sources
        ? this.stats.attributes.sources
        : {};

      return {
        base: sources.base || {},
        equipment: sources.equipment || {},
        bonuses: sources.bonuses || {},
      };
    },
    attributeTotals() {
      return this.stats.attributes && this.stats.attributes.total
        ? this.stats.attributes.total
        : {};
    },
    attributes() {
      return ATTRIBUTE_IDS.map((attributeId) => {
        const breakdown = {
          base: normaliseNumber(this.attributeSources.base[attributeId]),
          equipment: normaliseNumber(this.attributeSources.equipment[attributeId]),
          bonuses: normaliseNumber(this.attributeSources.bonuses[attributeId]),
        };

        return {
          id: attributeId,
          label: ATTRIBUTE_LABELS[attributeId] || attributeId,
          value: normaliseNumber(this.attributeTotals[attributeId]),
          breakdown,
        };
      });
    },
    lifecycle() {
      const lifecycle = this.player.lifecycle
        || (this.stats ? this.stats.lifecycle : null)
        || {};

      return {
        state: lifecycle.state || 'unknown',
        mode: lifecycle.mode || 'soft',
        deaths: normaliseNumber(lifecycle.deaths),
        livesRemaining: normaliseNumber(lifecycle.livesRemaining),
        cheatDeath: lifecycle.cheatDeath || {},
        respawn: lifecycle.respawn || {},
      };
    },
    lifecycleState() {
      const label = this.lifecycle.state || 'unknown';
      return label.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    },
    cheatDeathSummary() {
      const { cheatDeath } = this.lifecycle;
      const charges = normaliseNumber(cheatDeath.charges);
      if (charges <= 0) {
        return 'None';
      }

      const cooldown = normaliseNumber(cheatDeath.cooldownMs);
      if (cooldown > 0) {
        const seconds = Math.round(cooldown / 1000);
        return `${charges} (${seconds}s cd)`;
      }

      return `${charges} ready`;
    },
    respawnSummary() {
      const { respawn } = this.lifecycle;
      if (this.lifecycle.state === 'permadead') {
        return 'Locked';
      }

      if (!respawn || !respawn.pending) {
        return 'Ready';
      }

      if (respawn.at) {
        const remainingMs = respawn.at - Date.now();
        const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
        return `Pending (${remainingSeconds}s)`;
      }

      return 'Pending';
    },
  },
};
</script>

<style lang="scss" scoped>
div.stats_slot {
  height: 100%;
  font-family: "GameFont", sans-serif;
  color: #f1f1f1;
  text-align: left;
  text-shadow: 1px 1px 0 black;
  font-size: .8em;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  section {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 0.5rem;

    header {
      font-size: 0.85em;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.4rem;
      color: #f5d68a;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;

      li {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0.4rem;
        align-items: baseline;

        .label {
          text-transform: capitalize;
        }

        .value {
          font-weight: bold;
        }

        .breakdown {
          grid-column: 1 / -1;
          display: flex;
          gap: 0.4rem;
          opacity: 0.75;
          font-size: 0.75em;

          span {
            display: inline-block;
          }
        }
      }
    }
  }
}
</style>
