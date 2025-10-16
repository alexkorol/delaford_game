# Inventory System Spec

## Goals
- PoE/Diablo-inspired grid inventory (12×7) plus ragdoll equipment slots.
- Support future nested containers (bags, cube) and item rotations.
- Integrate with character stats, drag-drop UX, and keyboard shortcuts.

## Core Concepts

### Item Data Model
- `id`, `name`, `rarity`, `size` (width, height), `type`, `affixes`.
- `boundTo` (player uuid), `requires` (stats/level), `stackable` flag.
- `sockets` (for future gem system), `container` metadata (grid dimensions).

### Slots
- **Equipment slots**: main-hand, off-hand, helm, necklace, body, belt, ring1/2, gloves, boots.
- **Inventory grid**: 12 columns × 7 rows; stored as 2D array or occupancy map.
- **Containers**: items with their own grids; open in modal/panel.

### Placement Rules
- Items occupy W×H cells; collisions blocked.
- Drag-drop with ghost preview & rotation (R key to rotate 1×2, etc.).
- Auto-stack for stackable items where size = 1×1.
- When container opens, interactions limited to that context.

### UI Layout
- Inventory pane on right; equipment ragdoll above grid.
- Grid cells sized to match game art (32px multiples).
- Hover tooltip showing base stats, brands/bonds, requirements.
- Keyboard navigation: arrow keys move focus, Enter/Space to pick/drop.

### Brands & Bonds (Affix System)
- Each item has prefix (brand) and suffix (bond) slots with tier tables.
- Affixes modify stats via unified pipeline (attack, defense, elemental).
- Later: crafting UI for rerolling, binding items to players.

### Persistence & Networking
- Inventory stored server-side (grid coordinates per item).
- Clients send move actions; server validates occupancy and stat requirements.
- Containers should serialize nested content safely (limit depth to avoid loops).

## Implementation Phases
1. **Foundations**: data structures, server validations, simple drag-drop.
2. **Equipment UI**: ragdoll links to stat sheet, basic character sheet view.
3. **Affixes & Tooltips**: brand/bond schema, display, stat calculation.
4. **Containers**: nested inventory windows, capacity limits.
5. **Quality of Life**: auto-sort, quick-stack, keyboard shortcuts.

## Open Questions
- Should certain item sizes (e.g., weapons) have unique orientation rules?
- How will permadeath handle bound items (drop vs destroy vs legacy stash)?
- Do containers pause in-combat access or require safe zones?
