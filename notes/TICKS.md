# Life Sim Tick Engine v0 — Design Document

## Overview

The **v0 Tick Engine** introduces autonomous character behavior through a simple utility-based AI system that runs every in-game tick (default 5 minutes). Characters automatically decide what to do based on their needs, available affordances, and nearby objects.

This version focuses on deterministic logic, in-memory simulation, and testable behaviors using a small sample world. No UI or real-time animation is required yet.

---

## Core Concepts

### 1. World Hierarchy

The simulation uses a hierarchical spatial structure:

```
World → Region → Lot → Space → Item
```

* **World** — Global state containing all entities and time.
* **Region** — Geographical grouping of lots (e.g., Desert Willow region).
* **Lot** — Property or building (e.g., Home, Library, Park).
* **Space** — A room or sub-area inside a lot.
* **Item** — An interactable object enabling specific actions.

---

### 2. Affordances

**Affordances** are the actions a player or NPC can perform with an item. They describe what *can be done* in the environment.

Examples:

| Item Type        | Affordances           |
| ---------------- | --------------------- |
| Bed              | `sleep`               |
| Fridge           | `eat`                 |
| Stove            | `eat`                 |
| Bookshelf        | `read`                |
| Desk             | `write`               |
| Bench            | `chat_friend`, `date` |
| Art Installation | `view_art`            |
| Medicine Cabinet | `medicate`            |
| Community Board  | `volunteer`           |

Disabled or broken items will have `broken: true` and provide no affordances.

---

### 3. Needs and Emotions

Characters track three major categories of status:

| Category      | Properties                     | Description                   |
| ------------- | ------------------------------ | ----------------------------- |
| **Physical**  | `food`, `sleep`, `health`      | Immediate survival needs.     |
| **Emotional** | `friends`, `family`, `romance` | Social and relational needs.  |
| **Higher**    | `fulfillment`                  | Meaning, creativity, purpose. |

Each property is normalized from 0 to 1 (1 = fully satisfied, 0 = critical). Decay occurs automatically each tick.

#### Need Decay Rates

Decay per tick (5 minutes):

| Need          | Decay Rate | Time to Critical (from full) |
| ------------- | ---------- | ---------------------------- |
| `food`        | 0.04       | ~25 ticks (~2 hours)         |
| `sleep`       | 0.02       | ~50 ticks (~4 hours)         |
| `health`      | 0.01       | ~100 ticks (~8 hours)        |
| `friends`     | 0.015      | ~67 ticks (~5.5 hours)       |
| `family`      | 0.01       | ~100 ticks (~8 hours)        |
| `romance`     | 0.01       | ~100 ticks (~8 hours)        |
| `fulfillment` | 0.008      | ~125 ticks (~10 hours)       |

These rates ensure physical needs are most urgent, emotional needs are moderately pressing, and higher needs provide longer-term goals.

---

### 4. Activities

Each tick, characters choose an **Intent**, perform an **Action**, and generate **Memories**. Intent selection uses a combination of urgency and proximity.

#### Action Effects & Cooldowns

| Action        | Primary Effect | Secondary Effect    | Cooldown         |
| ------------- | -------------- | ------------------- | ---------------- |
| `eat`         | +0.35 food     | —                   | 30min (6 ticks)  |
| `sleep`       | +0.50 sleep    | —                   | 60min (12 ticks) |
| `medicate`    | +0.40 health   | —                   | 60min (12 ticks) |
| `chat_friend` | +0.25 friends  | —                   | 45min (9 ticks)  |
| `call_mom`    | +0.30 family   | —                   | 60min (12 ticks) |
| `date`        | +0.35 romance  | +0.10 friends       | 90min (18 ticks) |
| `read`        | +0.20 fulfill  | −0.05 friends       | 45min (9 ticks)  |
| `write`       | +0.25 fulfill  | −0.05 friends       | 60min (12 ticks) |
| `view_art`    | +0.20 fulfill  | +0.05 friends       | 30min (6 ticks)  |
| `volunteer`   | +0.30 fulfill  | +0.10 family        | 90min (18 ticks) |
| `work`        | +money         | −0.15 sleep         | 240min (48 ticks)|
| `idle`        | —              | —                   | 5min (1 tick)    |
| `move`        | navigation     | (travel cost only)  | 0min (instant)   |

**Notes:**
- Effects are **atomic** (applied immediately when action executes)
- Actions with negative secondary effects represent trade-offs
- `idle` is the fallback when no satisfying action is available
- `move` is automatically inserted before actions requiring travel

---

### 5. Movement & Pathfinding

#### Timing & Duration Mechanics

**Movement** is **instant** (does not consume ticks). Movement costs represent **utility penalties**, not time delays:

| From → To                  | Cost | Utility Penalty |
| -------------------------- | ---- | --------------- |
| Same space                 | 0    | 0.00            |
| Same lot, different space  | 1    | 0.25            |
| Same region, different lot | 2    | 0.50            |

This means:
- A character can move and perform an action in the same tick
- Movement only affects **intent selection** (prefer nearby items)
- No "traveling" state needed for v0

**Activity Duration** is also **atomic**:
- All actions apply their effects instantly when executed
- Cooldowns prevent repeated actions (not duration)
- Future versions may add multi-tick activities (e.g., sleep takes 12 ticks)

#### Pathfinding Algorithm

Characters always prefer the nearest usable item that satisfies their intent.

Pathfinding uses a **breadth-first search (BFS)** approach implemented in `findNearestSatisfier()`, exploring items in the following order:

1. Same space (cost 0)
2. Other spaces in same lot (cost 1)
3. Other lots in same region (cost 2)

When multiple items have the same cost, the first one found is selected (deterministic based on data structure order).

---

### 6. Utility Function

Each potential action is scored using the formula:

```plaintext
Utility = NeedWeight × Deficit − TravelPenalty + ContextBonus
```

Where:
* **Deficit** = (1.0 - current need value), representing how empty the need is
* **NeedWeight** varies by category (see below)
* **TravelPenalty** = 0.25 × movement cost
* **ContextBonus** = trait/social modifiers (see below)

#### Need Weights

| Category      | Weight | Rationale                         |
| ------------- | ------ | --------------------------------- |
| **Physical**  | 1.0    | Survival needs take priority      |
| **Emotional** | 0.6    | Important but less urgent         |
| **Higher**    | 0.5    | Long-term goals, lower urgency    |

#### Context Bonus Rules

**Trait-Based Bonuses** (+0.15 per matching trait):

| Trait       | Bonus Actions              |
| ----------- | -------------------------- |
| `bookish`   | `read`, `write`            |
| `helpful`   | `volunteer`, `call_mom`    |
| `kind`      | `chat_friend`, `date`      |
| `creative`  | `write`, `view_art`        |
| `athletic`  | (future: `kayak`, `hike`)  |

**Social Bonuses** (require proximity):

| Condition                        | Action        | Bonus |
| -------------------------------- | ------------- | ----- |
| Friend in same space             | `chat_friend` | +0.20 |
| Romantic partner in same space   | `date`        | +0.25 |
| Multiple characters present      | `view_art`    | +0.10 |

**Example Calculation:**

Maya (at Home → Kitchen) with `food = 0.3`, trait `bookish`:

- **Eat (Fridge, same space):**
  - Utility = 1.0 × (1.0 − 0.3) − 0.25 × 0 + 0 = **0.70**

- **Read (Library → Main, cost 2):**
  - Utility = 0.5 × (1.0 − 0.8) − 0.25 × 2 + 0.15 = **−0.25**
  - (Negative utility = won't be selected)

Actions with higher utility scores are selected as the current intent.

---

### 7. Cooldowns and Decay

Every action sets a **cooldown timer** preventing repetitive behavior. For example, eating has a 30-minute cooldown, while sleeping has 60. Cooldowns and needs decay each tick to simulate time passage.

---

### 8. Memory System (v0)

Each time a character performs an action, a **Memory** record is created for future reference.

#### Memory Structure

```typescript
interface Memory {
  id: string;              // UUID
  characterId: string;
  timestamp: number;       // Tick number when created
  action: string;          // e.g., "eat", "read"
  locationId: string;      // Lot ID where action occurred
  spaceId?: string;        // Space ID (if applicable)
  itemId?: string;         // Item used (if applicable)
  otherCharacters?: string[]; // Other characters present
}
```

#### v0 Behavior

For v0, memories are **passive records only**:
* Logged to console or stored in database
* Not used for decision-making (no memory-based utility modifiers)
* Useful for debugging and understanding character behavior
* Foundation for future features (e.g., "prefer places with good memories")

---

### 9. Failure States & Fallback Behavior

#### Unsatisfiable Needs

When a character **cannot satisfy** their highest-priority need (e.g., all beds broken, no food items exist), they execute the **idle** action:

* No need restoration
* 1-tick cooldown
* Character remains at current location
* Memory logged with `action: "idle"` and reason

#### Starvation / Critical States

When a need reaches **0.0**, it is considered **critical**:

* `food = 0.0` → Character becomes "starving" (future: death/collapse)
* `sleep = 0.0` → Character becomes "exhausted" (future: collapse)
* `health = 0.0` → Character becomes "critically ill"

For v0, critical states are **logged only** (no mechanical consequences). Future versions may add:
* Death/incapacitation at sustained 0.0
* Emergency overrides (force sleep when exhausted)
* Visual indicators

---

### 10. Tick Execution Order

Each tick follows this deterministic sequence:

1. **Decay Phase**
   * Decrement all character needs by their decay rates
   * Decrement all cooldown timers by 1 tick

2. **Decision Phase** (for each character)
   * Enumerate all available actions (items with affordances in range)
   * Calculate utility for each action
   * Select action with highest utility (skip if on cooldown)
   * If no valid action, select `idle`

3. **Execution Phase** (for each character)
   * If action requires movement, update character location (instant)
   * Apply action effects (modify needs)
   * Set cooldown timer
   * Create memory record

4. **Bookkeeping**
   * Increment global tick counter
   * Log tick summary (optional)

**Execution Order Notes:**
* All characters' needs decay simultaneously (Phase 1)
* Characters act sequentially in deterministic order (Phase 2-3)
* If two characters want to use the same item, first in order wins (future: add item capacity)

---

## Testing World (v0)

### Sample Lots and Items

| Lot     | Space   | Items                                    | Affordances                  |
| ------- | ------- | ---------------------------------------- | ---------------------------- |
| Home    | Kitchen | Fridge, Stove, Table                     | `eat`, `eat`, `eat`+`chat`   |
| Home    | Bedroom | Bed                                      | `sleep`                      |
| Library | Main    | Bookshelf, Desk, Broken Bookshelf        | `read`, `write`, (none)      |
| Library | Stacks  | Bookshelf (secondary)                    | `read`                       |
| Park    | Lawn    | Bench, Art Installation                  | `chat_friend`+`date`, `view_art` |
| Park    | Trail   | *(empty, for path traversal testing)*    | —                            |

**Notable Features:**
* **Table** in Kitchen provides both `eat` and `chat_friend` (multi-affordance testing)
* **Broken Bookshelf** in Library → Main has no affordances (fallback testing)
* **Trail** in Park is empty (confirms BFS doesn't break on empty spaces)

### Test Characters

| Character | Start Location | Traits           | Initial Needs (low values)              |
| --------- | -------------- | ---------------- | --------------------------------------- |
| Maya      | Home → Kitchen | `bookish`, `helpful` | `food: 0.35`, `fulfillment: 0.20`       |
| Rosa      | Home → Bedroom | `kind`           | `sleep: 0.25`, `friends: 0.30`          |
| Alex      | Library → Main | `creative`       | `fulfillment: 0.40`, `health: 0.50`     |

**Character Behavioral Expectations:**

**Maya:**
1. Tick 1: Low food (0.35) → eats at Table (Kitchen, cost 0)
2. Tick 7+: After cooldown, low fulfillment → travels to Library (cost 2), reads bookshelf
3. If Library → Main bookshelf broken → travels to Stacks (cost 1)

**Rosa:**
1. Tick 1: Low sleep (0.25) → sleeps at Bed (Bedroom, cost 1 from current space)
2. Tick 13+: After cooldown, low friends → travels to Park → Lawn (cost 2), chats at bench
3. If Maya also at Park → social bonus increases `chat_friend` utility

**Alex:**
1. Tick 1: Low fulfillment (0.40) + `creative` trait → writes at Desk (same space, cost 0)
2. Tick 13+: After cooldown, may read bookshelf or travel to Park for `view_art`

### Expected Test Cases

| Scenario                  | Character | Expected Behavior                                      |
| ------------------------- | --------- | ------------------------------------------------------ |
| **Hunger low**            | Maya      | Eats at nearest item (Fridge/Stove/Table in Kitchen)   |
| **Fulfillment low**       | Maya      | Travels to Library (cost 2), reads bookshelf           |
| **Broken bookshelf**      | Maya      | Skips broken item, uses Library → Stacks bookshelf     |
| **Social need**           | Rosa      | Travels to Park, chats at bench                        |
| **Sleep low**             | Rosa      | Sleeps at Bed (cost 1 from Bedroom)                    |
| **Cooldown active**       | Any       | Selects different action or idles                      |
| **Trait bonus**           | Alex      | Prefers `write` over other fulfillment actions         |
| **Social bonus**          | Maya+Rosa | Higher `chat_friend` utility when both at Park         |
| **Multi-affordance item** | Any       | Table correctly offers both `eat` and `chat_friend`    |
| **Empty space traversal** | Any       | BFS correctly skips Park → Trail when searching        |

---

## Key Terms

| Term           | Definition                                                         |
| -------------- | ------------------------------------------------------------------ |
| **Affordance** | The set of actions an object enables. Stored on `Item.actions`.    |
| **Intent**     | A character’s current chosen goal (e.g., `eat`, `sleep`).          |
| **Action**     | The execution of an intent; modifies character state.              |
| **Utility**    | The desirability score of an action based on need and travel cost. |
| **Cooldown**   | Time delay preventing an action from being repeated.               |
| **Tick**       | One simulation step (e.g., 5 in-game minutes).                     |
| **Satisfier**  | The nearest usable item capable of fulfilling an intent.           |

---

## Future v1 Goals

* Introduce **save/load** UI for JSON snapshots.
* Support **multi-region travel** (region cost > 2).
* Add **schedule planning** (e.g., work hours).
* Enable **dynamic events** and **social gatherings**.
* Integrate **animations** and **visual state indicators** (optional).

---

## Summary

This v0 tick engine enables a complete, observable simulation loop:

1. Each character’s needs decay.
2. Available actions are enumerated via item affordances.
3. The nearest satisfying object is found using BFS.
4. A utility function ranks options.
5. The best intent is executed and recorded.

All logic runs in-memory and can be fully tested through JSON snapshots or Pinia store inspection, providing a robust baseline for expanding the life simulator.
