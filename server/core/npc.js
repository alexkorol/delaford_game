import Socket from '@server/socket';
import UI from 'shared/ui';
import * as emoji from 'node-emoji';
import npcs from './data/npcs';
import world from './world';

const BASE_MOVE_DURATION = 150;

const directionVectors = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const computeStepDuration = (direction) => {
  const delta = directionVectors[direction] || { x: 0, y: 0 };
  const diagonal = Math.abs(delta.x) === 1 && Math.abs(delta.y) === 1;
  const multiplier = diagonal ? Math.SQRT2 : 1;
  return Math.round(BASE_MOVE_DURATION * multiplier);
};

class NPC {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;

    // Examine text
    this.examine = data.examine;

    // What actions can be performed on them?
    this.actions = data.actions;

    // Where they will spawn on world restarts
    this.spawn = {
      x: data.spawn.x,
      y: data.spawn.y,
    };

    // Where are they right now?
    this.x = data.spawn.x;
    this.y = data.spawn.y;

    // How far they can walk from spawn location
    this.range = data.spawn.range;

    // When they last performed an action
    this.lastAction = 0;

    // What column they are on in tileset
    this.column = data.graphic.column;

    this.movementStep = {
      sequence: 0,
      startedAt: Date.now(),
      duration: 0,
      direction: null,
      blocked: false,
    };
  }

  /**
   * Load the NPCs into the game world
   *
   * @param {this} context The server context
   */
  static load(context) {
    npcs.forEach((npc) => {
      world.npcs.push(new NPC(npc));
    }, context);

    console.log(`${emoji.get('walking')}  Loading NPCs...`);
  }

  /**
   * Simulate NPC movement every cycle
   */
  static movement() {
    world.npcs.map((npc) => {
      // Next movement allowed in 2.5 seconds
      const nextActionAllowed = npc.lastAction + 2500;

      if (npc.lastAction === 0 || nextActionAllowed < Date.now()) {
        // Are they going to move or sit still this time?
        const action = UI.getRandomInt(1, 2) === 1 ? 'move' : 'nothing';

        // NPCs going to move during this loop?
        let moved = false;
        let directionTaken = null;
        let blockedAttempt = false;

        if (action === 'move') {
          // Which way?
          const direction = ['up', 'down', 'left', 'right'];
          const going = direction[UI.getRandomInt(0, 3)];
          directionTaken = going;

          // What tile will they be stepping on?
          const tile = {
            background: UI.getFutureTileID(world.map.background, npc.x, npc.y, going),
            foreground: UI.getFutureTileID(world.map.foreground, npc.x, npc.y, going) - 252,
          };

          // Can the NPCs walk on that tile in their path?
          const walkable = {
            background: UI.tileWalkable(tile.background),
            foreground: UI.tileWalkable(tile.foreground, 'foreground'),
          };

          const canWalkThrough = walkable.background && walkable.foreground;

          switch (going) {
          default:
          case 'up':
            if ((npc.y - 1) >= (npc.spawn.y - npc.range) && canWalkThrough) {
              npc.y -= 1;
              moved = true;
            } else {
              blockedAttempt = true;
            }
            break;
          case 'down':
            if ((npc.y + 1) <= (npc.spawn.y + npc.range) && canWalkThrough) {
              npc.y += 1;
              moved = true;
            } else {
              blockedAttempt = true;
            }
            break;
          case 'left':
            if ((npc.x - 1) >= (npc.spawn.x - npc.range) && canWalkThrough) {
              npc.x -= 1;
              moved = true;
            } else {
              blockedAttempt = true;
            }
            break;
          case 'right':
            if ((npc.x + 1) <= (npc.spawn.x + npc.range) && canWalkThrough) {
              npc.x += 1;
              moved = true;
            } else {
              blockedAttempt = true;
            }
            break;
          }
        }

        const sequence = npc.movementStep && typeof npc.movementStep.sequence === 'number'
          ? npc.movementStep.sequence + 1
          : 1;
        const startedAt = Date.now();
        const duration = moved && directionTaken ? computeStepDuration(directionTaken) : 0;

        npc.movementStep = {
          sequence,
          startedAt,
          duration,
          direction: moved ? directionTaken : null,
          blocked: action === 'move' && blockedAttempt && !moved,
        };

        // Register their last action
        npc.lastAction = startedAt;
      }

      return npc;
    });

    const meta = {
      movements: world.npcs.map((npc) => ({
        id: npc.id,
        uuid: npc.uuid || null,
        movementStep: npc.movementStep,
      })),
    };

    // Tell the clients of the new NPCs
    Socket.broadcast('npc:movement', world.npcs, null, { meta });
  }
}

module.exports = NPC;
