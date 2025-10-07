# Frontend Guide

The Clockwork Town frontend is built with Vue.js 3, Vue Router, Tailwind CSS, and Vite.

## Development

### Running Backend + Frontend in Development Mode

**Option 1: Separate Terminals (Recommended for Development)**

Terminal 1 - Backend:
```bash
npm run dev
```

Terminal 2 - Frontend with hot reload:
```bash
npm run dev:frontend
```

The frontend dev server will proxy GraphQL requests to `http://localhost:4000/graphql`.

**Option 2: Production Mode (Backend serves built frontend)**

```bash
npm run build:frontend
npm start
```

Visit http://localhost:4000 to see both the API and frontend.

## Project Structure

```
frontend/
├── index.html              # HTML entry point
├── src/
│   ├── main.js            # Vue app initialization
│   ├── App.vue            # Root component with nav
│   ├── style.css          # Tailwind CSS imports
│   ├── router.js          # Vue Router configuration
│   ├── graphql.js         # GraphQL client and queries
│   ├── components/
│   │   └── Breadcrumbs.vue
│   └── views/
│       ├── WorldList.vue   # Home page: list worlds
│       ├── RegionList.vue  # List regions in a world
│       ├── LotList.vue     # List lots in a region
│       └── SpaceList.vue   # List spaces in a lot
```

## Features

### Navigation Flow

1. **Worlds** (/) - Home page
   - Create, edit, delete worlds
   - Click world to view regions

2. **Regions** (/world/:worldId)
   - Create, edit, delete regions
   - Breadcrumbs: Worlds > World Name
   - Click region to view lots

3. **Lots** (/world/:worldId/region/:regionId)
   - Create, edit, delete lots
   - Breadcrumbs: Worlds > World Name > Region Name
   - Click lot to view spaces

4. **Spaces** (/world/:worldId/region/:regionId/lot/:lotId)
   - Create, edit, delete spaces
   - Separated into Indoor Rooms and Outdoor Areas
   - Breadcrumbs: Worlds > World Name > Region Name > Lot Name

### Form Operations

All entities support:
- **Create**: Click "Create [Entity]" button, fill form, save
- **Edit**: Click edit icon (pencil), modify form, save
- **Delete**: Click delete icon (trash), confirm deletion

## GraphQL Integration

The frontend uses `graphql-request` to communicate with the backend GraphQL API. All queries and mutations are defined in `frontend/src/graphql.js`.

Example query:
```graphql
query GetWorlds {
  worlds {
    id
    name
    createdAt
  }
}
```

Example mutation:
```graphql
mutation CreateWorld($input: NewWorld!) {
  createWorld(input: $input) {
    id
    name
    createdAt
  }
}
```

## Building for Production

```bash
npm run build:frontend
```

This generates optimized static files in the `dist/` directory, which the Node.js server will automatically serve when running `npm start`.

## Styling

Tailwind CSS v4 is configured with the `@tailwindcss/postcss` plugin. Global styles are imported in `frontend/src/style.css`.

## Troubleshooting

**Issue**: Frontend doesn't load
- Ensure you've run `npm run build:frontend`
- Check that `dist/` directory exists
- Verify backend is running on port 4000

**Issue**: GraphQL errors
- Ensure backend DDL is applied: `npm run ddl`
- Check backend logs for errors
- Verify GraphQL schema matches mutations/queries in `graphql.js`

**Issue**: Styling not working
- Ensure Tailwind config includes all Vue files
- Check that PostCSS is using `@tailwindcss/postcss`
- Rebuild: `npm run build:frontend`
