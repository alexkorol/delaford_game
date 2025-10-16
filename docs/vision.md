# Vision

## Pillars

- **WASD-first ARPG**: keyboard movement/combat with optional mouse context menus.
- **Character Identity**: permadeath, name validation, player-tied loot.
- **Rich Itemisation**: spatial inventory, nested containers, brands & bonds.
- **Shared Stat Ecosystem**: players and monsters use the same attribute pipeline.
- **Party-Based Instances**: towns are persistent hubs; adventures occur in instanced realms.

## High-Level Themes

### Foundation & Tooling
- Upgrade dependencies and build tooling.
- Improve developer experience with one-command setup and tasks.
- Establish CI/testing pipelines and documentation.

### Gameplay Core
- Implement Str/Dex/Int, health/mana, and scaling rules.
- Create permadeath/cheat-death mechanics.
- Add LLM-backed RP naming enforcement.
- Design the "Flower of Life" passive tree.

### Inventory & Items
- Build 12×7 backpack and ragdoll equipment slots.
- Support nested containers (bags, cube) with recursive grids.
- Introduce brands/bonds (prefix/suffix) affix system.
- Bind items to player identity.

### UI/UX
- Left stats pane, right inventory pane inspired by PoE.
- Semi-transparent, closable chat overlay.
- Pixel-perfect rendering that avoids sprite squish via letterboxing/scrolling.
- Full keyboard navigation, configurable hotkeys.

### Monsters & Combat
- Shared stat pipeline, monster categories, rarity tiers.
- Balanced combat loop with interpolated movement and responsive skills.
- AI behaviors for different archetypes.

### Networking & World
- Persistent towns with social features.
- Party instancing and semi-random tile-based maps.
- Infinite realm activities (Abyss/Pandemonium analogues).
- Player-modifiable town structures.

### Supporting Systems
- Logging/analytics for balance.
- Live operations tools (GM commands, rollback, event triggers).
- Localization scaffolding.

## Open Questions
- How to host/secure LLM name validation (local vs remote)?
- Which tech stack upgrades (Vue 3 + Vite?) are feasible short-term?
- Permadeath mitigation currency or shrines—how is it earned?
- How deep should container recursion go (limits to avoid UI chaos)?
- Should towns be per-region or global?

## Milestones (Draft)
1. **MVP Movement & Inventory**: WASD polish, click cancel, 12×7 inventory skeleton.
2. **Core Stats & Affixes**: character sheets, brands/bonds, monster parity.
3. **UI Refresh**: new panes, chat overlay, responsive layout.
4. **Instance Prototype**: party lobby, one tileset instance, simple loot loop.
5. **Passive Tree Alpha**: partial flower, progression tied to drops/quests.
6. **Permadeath Loop**: death rules, cheat-death prototype, name validation.

This document evolves alongside implementation. Add sections or RFCs as systems mature.
