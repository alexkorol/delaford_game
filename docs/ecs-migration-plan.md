# ECS Migration Plan for Player and NPC Systems

## 1. Current Responsibilities Overview

| Domain | Player (`server/core/player.js`) | NPC (`server/core/npc.js`) |
| --- | --- | --- |
| Movement & animation | Holds positional state (`x`, `y`), facing, animation timer, active path, and `movementStep`; delegates to the player movement handler for facing, animation, step registration, pathfinding, blocking checks, and walking queued paths. | Maintains spawn data, range, facing, animation, and `movementStep`; the NPC movement handler resolves facing, updates steps, enforces range, and performs random movement ticks. |
| AI / action scheduling | Tracks the currently executing action, an action queue, and resets these during path cancellation; path walking consumes queued actions via `playerEvent` callbacks. | Uses `performRandomMovement` to pick idle vs. move actions on a cooldown, providing lightweight NPC AI. |
| Combat | Stores combat stance, cooldowns, last skill, and input history; `recordSkillInput` enforces global cooldowns, updates combat state, and triggers attack animations via the movement handler. | No combat-specific state today. |
| Networking | Static helpers broadcast movement, animation, and stats snapshots; `stopMovement` emits a `player:stopped` event. | The NPC loop broadcasts batched movement/animation payloads to clients. |
| Persistence & progression | Owns bank, skills, wearables, stats, and inventory manager initialization; `update` packages world state, inventory, equipment, and skills for persistence through the auth API. | No persistence logic inside the class. |

## 2. Proposed ECS Components

* **Transform** – Stores spatial data (`sceneId`, `x`, `y`, facing) and visual orientation/animation handles formerly on the class instances.
* **MovementState** – Captures pathfinding grids, current path metadata, movement step timing, blocked flags, and movement flags (`moving`, `blocked`).
* **ActionQueue** – Holds the active action, queued tasks, and cooldown markers for both manual actions (`queue`, `action`) and NPC idle timers (`lastAction`).
* **CombatState** – Wraps the combat stats, cooldowns, stance, last skill metadata, and input history managed by `recordSkillInput`.
* **StatSheet** – Contains derived attribute sources, resources, and shortcut mappings maintained by the stats manager and worn-item totals.
* **InventoryState** – Tracks inventory slots, equipped wearables, and related metadata produced during initialization.
* **PersistenceMeta** – Maintains tokens, UUID, sockets, and snapshots required to assemble persistence payloads (`token`, `uuid`, `socket_id`, bank/skills copies).
* **NpcSpawn** – Holds spawn coordinates, roaming range, and flavor text (`examine`, `actions`) for static NPC data.

## 3. Systems vs. Component Initializers

### Systems

* **Movement System** (from `movement-handler`): processes `MovementState` + `Transform`, resolves facing, pathfinding, and step scheduling, and emits networking events.
* **Combat Input System** (from `combat-controller`): consumes `CombatState`, `MovementState`, and queued actions to enforce cooldowns and drive animations.
* **Stat Computation System** (runtime `stats-manager`): recalculates derived stats, applies damage/healing, and syncs client payloads against `StatSheet` and `InventoryState`.
* **NPC Behavior System** (from `npc/movement-handler`): updates `NpcSpawn`, `MovementState`, and animations, encapsulating random movement logic.
* **Networking System** (broadcast helpers): gathers `Transform`, `MovementState`, and animation data to publish state to sockets.

### Component Initializers / Factories

* **Inventory Component Initializer** (`inventory-manager`): constructs the initial `InventoryState` and wearable metadata during entity creation.
* **NPC Prefab Loader** (`NPC.load`): instantiates `NpcSpawn`, `Transform`, and `MovementState` components from data tables.
* **Player Setup Scripts** (constructor bootstrap): seed `StatSheet`, `InventoryState`, and `CombatState` from persistence payloads.

## 4. Migration Checklist

1. **Create ECS components** – Implement `Transform`, `MovementState`, `ActionQueue`, `CombatState`, `StatSheet`, `InventoryState`, `PersistenceMeta`, and `NpcSpawn`; populate them during entity spawn using the data currently assigned in the constructors.
2. **Port movement logic** – Move all movement-handler functions into a `MovementSystem` that reads/writes `MovementState` and `Transform`, including broadcasting and queue servicing (`walkPath`, `stopMovement`, `cancelPathfinding`).
3. **Refactor combat interactions** – Transition `recordSkillInput` into a combat system processing `CombatState` and triggering animation updates via the ECS `MovementState` interface.
4. **Adapt stat management** – Relocate `buildInitialStats`, `refreshDerivedStats`, and damage/healing helpers into a stat system operating over `StatSheet`, ensuring wearable bonuses flow from `InventoryState`.
5. **Rehome networking hooks** – Replace static broadcast helpers with systems that serialize component data; ensure persistence routines (`update`) read from ECS components rather than class fields.
6. **Migrate NPC behavior** – Convert `performRandomMovement` and the NPC loop to operate on `NpcSpawn`, `MovementState`, and `Transform` components, with the broadcast system handling socket emission.
7. **Audit leftovers** – For each removed class method (`move`, `walkPath`, `stopMovement`, `queueEmpty`, `broadcast*`, `update`), confirm an equivalent system or helper now owns the behavior, and update call sites to use ECS dispatch or component accessors.

