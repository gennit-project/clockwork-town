# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a text-based life simulator built with GraphQL, TypeScript, and Kùzu embedded graph database. The system models a virtual world with characters, locations, activities, relationships, and items using a graph-based data structure.

## Technology Stack

- **Database**: Kùzu (embedded graph database) - state saved locally to `data/clockwork-town.kuzu`
- **Backend**: GraphQL Yoga server with TypeScript
- **Schema**: GraphQL schema-first approach with resolver pattern
- **Future**: Vue.js frontend wrapped in Capacitor for multi-device export (not yet implemented)

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Start production server
npm start

# Apply DDL schema (creates/updates database tables)
npm run ddl
```

## Database Architecture

### Core Design Philosophy

The application uses Kùzu's graph database with Cypher queries. The schema is defined in two places:
- **GraphQL schema**: `src/schema.graphql` (API contract)
- **Kùzu DDL**: `src/kuzu.ddl.sql` (database structure)

### Database Connection

The database connection is managed in `src/db.ts`:
- Exports `db` (Database instance) and `conn` (Connection instance)
- Database path: `data/clockwork-town.kuzu`
- `applyDDL()` applies schema from `src/kuzu.ddl.sql`
- DDL application strips single-line comments (`--`) and splits on semicolons

### Query Helpers (`src/kuzuHelpers.ts`)

- `q<T>(cypher, params)`: Execute Cypher query and return typed results as objects
- `batch<T>(fn)`: Transaction-like wrapper for sequential operations

## Code Structure

### Resolvers Pattern

Resolvers are organized by domain in `src/resolvers/`:
- `world.ts`: World, Region, Lot queries
- `character.ts`: Character queries/mutations (create, move, pagination)
- `activity.ts`: Activity mutations (start, stop)
- `relationship.ts`: Relationship logic (imported but not yet implemented)
- `index.ts`: Aggregates all resolvers into single export

Each resolver file exports an object with `Query` and/or `Mutation` properties containing resolver functions.

### Graph Data Model

The world is modeled as nodes and relationships:

**Key Node Types:**
- World → Region → Lot → Space
- Character, Animal, Household
- Item (with containment/storage support)
- ActivityType (template), Activity (instance)
- Trait, Value, Memory
- Relationship (as node, with FROM/TO edges)

**Key Edge Types:**
- Location: `AT` (character→lot), `HOME` (character→lot), `IN_HOUSEHOLD` (character→household)
- Ownership: `OWNS` (character→item), `OWNS_PET` (character→animal)
- Activities: `PERFORMS` (character→activity), `INSTANCE_OF` (activity→activityType)
- Family: `PARENT_OF` (character→character), `ANIMAL_PARENT_OF` (animal→animal)
- Traits/Values: `HAS_TRAIT`, `HAS_VALUE`
- Relationships: Uses `Relationship` node with `FROM_CHARACTER`, `TO_CHARACTER`, `TO_ANIMAL` edges

### Character State Management

Characters have:
- **Location**: Tracked via `AT` edge with timestamp
- **Activities**: Via `PERFORMS` edge to Activity nodes
- **Needs**: Modeled as flexible key/value pairs (basic, emotional, self-actualization)
- **Relationships**: Via Relationship nodes supporting character↔character and character↔animal

### Moving Characters

When moving a character (see `character.ts:84`):
1. Delete existing `AT` edges
2. Create new `AT` edge with `NOW()` timestamp

### Starting Activities

When starting an activity (see `activity.ts:6`):
1. Mark all existing activities as 'stopped'
2. Create new Activity node with UUID
3. Link Character→Activity and Activity→ActivityType

## GraphQL Schema Conventions

- Use `ID!` for all entity identifiers
- Pagination uses connection pattern with `edges`, `cursor`, `hasNextPage`
- Timestamp fields use `DateTime` scalar
- Enums defined for constrained values (LotType, RelationshipDepth, SelfActualizationType)
- Arrays of strings used for flexible lists (traits, needs, activities)

## Server Startup Sequence

1. Validate `schema.graphql` exists
2. Apply DDL via `applyDDL()` (creates/updates database schema)
3. Load GraphQL schema from file
4. Create executable schema with resolvers
5. Start Yoga server on port 4000 (or `PORT` env var)

## Working with Cypher Queries

- Use parameterized queries (`$param`) to prevent injection
- Match patterns: `MATCH (c:Character {id:$id})`
- Create nodes: `CREATE (:Character {id:$id, name:$name})`
- Create edges: `CREATE (c)-[:AT {at: NOW()}]->(l)`
- Delete edges: `MATCH (c)-[a:AT]->() DELETE a`
- Optional matches: `OPTIONAL MATCH` for nullable relationships

## Future Considerations

- Backup/restore to Google Drive (schema includes mutations, not yet implemented)
- Frontend implementation with Vue.js
- Need decay system (decayPerHour defined but not implemented)
- Activity duration tracking (defaultDurationMinutes defined but not used)
