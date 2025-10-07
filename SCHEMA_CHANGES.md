# Schema Change Procedure

When you need to modify the data model, follow these steps to keep the GraphQL schema and database schema in sync.

## Steps for Schema Changes

### 1. Update the GraphQL Schema

Edit `src/schema.graphql` to reflect your changes:
- Add/modify types, fields, queries, or mutations
- Use proper GraphQL syntax (unions must be defined separately, not inline)
- Document complex types with comments

### 2. Update the Database DDL

Edit `src/kuzu.ddl.sql` to match the GraphQL changes:
- Add/modify NODE tables for entities
- Add/modify REL tables for relationships
- Ensure property types match (STRING, INT64, BOOL, TIMESTAMP, arrays with `[]`)
- Avoid SQL reserved keywords (e.g., use `CONTAINS` instead of `IN`)

### 3. Apply DDL Changes

Run the DDL script to update the database:

```bash
npm run ddl
```

This will:
- Read `src/kuzu.ddl.sql`
- Strip all comments (inline and full-line)
- Execute each statement against the Kùzu database
- Create/update tables in `data/clockwork-town.kuzu`

**Note**: Kùzu's `CREATE TABLE IF NOT EXISTS` is idempotent for structure, but adding new columns to existing tables may require manual migration or dropping/recreating tables.

### 4. Update Resolvers

Update resolver files in `src/resolvers/` to handle new fields/queries:
- Add resolver functions for new queries/mutations
- Update Cypher queries to match new node/relationship names
- Use the `q()` helper from `src/kuzuHelpers.ts` for queries
- Export resolvers and add them to `src/resolvers/index.ts`

### 5. Test the Changes

```bash
# Start dev server
npm run dev

# Navigate to http://localhost:4000/graphql
# Test queries/mutations in the GraphQL playground
```

## Common Pitfalls

### Reserved Keywords
Avoid SQL/Cypher reserved keywords for table/relationship names:
- ❌ `IN`, `ON`, `AS`, `FROM`, `TO`, `SET`, etc.
- ✅ Use alternatives like `CONTAINS`, `PLACED_ON`, etc.

### Union Types in GraphQL
Don't use inline union syntax:
```graphql
# ❌ Wrong
type Relationship {
  from: Character | Animal!
}

# ✅ Correct
union RelationshipEntity = Character | Animal

type Relationship {
  from: RelationshipEntity!
}
```

### Type Mapping (GraphQL ↔ Kùzu)
| GraphQL | Kùzu DDL |
|---------|----------|
| `ID`, `String` | `STRING` |
| `Int` | `INT64` |
| `Float` | `DOUBLE` |
| `Boolean` | `BOOL` |
| `DateTime` | `TIMESTAMP` |
| `[String!]` | `STRING[]` |

### Bidirectional Relationships
If relationships need to work in both directions (e.g., Animal→Character and Character→Animal), create separate `FROM_*` edges:
```sql
CREATE REL TABLE FROM_CHARACTER(FROM Relationship TO Character);
CREATE REL TABLE FROM_ANIMAL(FROM Relationship TO Animal);
CREATE REL TABLE TO_CHARACTER(FROM Relationship TO Character);
CREATE REL TABLE TO_ANIMAL(FROM Relationship TO Animal);
```

## Schema Files Reference

- **GraphQL Schema**: `src/schema.graphql` - API contract
- **Database DDL**: `src/kuzu.ddl.sql` - Database structure
- **Resolvers**: `src/resolvers/*.ts` - Query/mutation implementations
- **Database Helpers**: `src/kuzuHelpers.ts` - Query utilities
- **Database Connection**: `src/db.ts` - DB initialization and DDL application
