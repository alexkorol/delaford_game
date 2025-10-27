<h1 align="center">Delaford Fork</h1>
<p align="center">Action RPG sandbox prototype exploring WASD-first controls, Diablo/PoE-inspired systems, and party-based instances.</p>

---

## Project Vision

This fork is a fresh take on the original Delaford codebase. The goal is to build a modern 2D ARPG that:

- Puts **keyboard movement and combat** front and center, with mouse interactions as optional overlays.
- Features a **Diablo/PoE-style inventory** with spatial constraints, nested containers, and deep itemisation (brands/bonds).
- Favors **meaningful character identity**: permadeath with tradeoffs, RP-enforced names via LLM validation, shared stat frameworks for monsters and players.
- Supports **party-based instanced worlds** and persistent player-modifiable towns.

The high-level roadmap is captured in [`docs/vision.md`](docs/vision.md). Its a living document that gathers feature specs, UX references, and open questions.

## Quick Start

```bash
git clone git@github.com:YOUR_USERNAME/delaford_fork.git
cd delaford_fork
volta install node@22 npm@10 # or use nvm/asdf to match .nvmrc
npm install
npm run dev           # spins up Vite + the game server in parallel
```

The Vite dev server runs at `http://localhost:5173`, the websocket server on `9000`, and the Express wrapper on `6500`.

Common scripts:

```bash
npm run build        # bundle the client via Vite
npm run test:unit    # execute Vitest-powered unit tests
npm run test:e2e     # run Playwright end-to-end smoke tests against a preview build
```

Troubleshooting tips and platform-specific notes live in [`docs/development-setup.md`](docs/development-setup.md).

## Repository Layout

- `server/`  gameplay logic, networking, data tables.
- `src/`  Vue SPA client, assets, and UI widgets.
- `docs/`  project vision, setup notes, feature planning.
- `src/stores/`  Pinia stores and legacy adapters.

Legacy docs from the original project have been removed or archived. Everything in this fork will track the new gameplay direction.

## Active Work Streams

1. **Foundation & Tooling**
   - Dependency audit & upgrades.
   - VS Code tasks / npm scripts for one-command dev setup.
   - CI hooks, lint/format rules, testing harness.
2. **Gameplay Core**
   - Character stats (Str/Dex/Int), permadeath, cheat-death mechanics.
   - LLM-backed RP name validation.
   - Passive flower of life skill tree.
3. **Inventory & Items**
   - 127 backpack grid, equipment paper doll, nested containers.
   - Brands/bonds affix model and item binding to player identity.
4. **UI/UX**
   - PoE-style left/right panes (stats & inventory), semi-transparent chat.
   - Pixel-perfect rendering with graceful handling on small displays.
5. **Monsters & Combat**
   - Shared stat pipeline with players, monster categories & rarities.
   - Combat loop tuning, AI behaviors.
6. **Networking & World**
   - Party instances, persistent towns, semi-random tileset generator.
   - Infinite realm concepts (Abyss/Pandemonium equivalents).

Each stream will break into issues/PRs with detailed implementation notes.

## Contribution Guide (WIP)

Contribution standards are being refreshed to match the new scope. Until a formal guide is published:

- Prefer opening an issue/discussion before major work.
- Follow existing lint rules (`npm run lint`).
- Document feature behaviour in `/docs` as you implement it.

## License & Attribution

Some assets still originate from the original Delaford project (tilesets, fonts, music). Attribution details remain in the asset folders. As the fork evolves, well re-evaluate asset licensing and replacements.
