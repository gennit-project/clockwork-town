# Item Affordances Setup Helper

## Step 1: Get All Item IDs

Run this query in GraphQL Playground (`http://localhost:4000/graphql`):

```graphql
query GetAllItems {
  region(id: "region-desert-willow") {
    lots {
      name
      indoorRooms {
        name
        items {
          id
          name
          description
        }
      }
      outdoorAreas {
        name
        items {
          id
          name
          description
        }
      }
    }
  }
}
```

## Step 2: Copy Item IDs and Run Mutations

Based on the IDs from Step 1, run these mutations one by one (or use the `setup-affordances.graphql` file):

### Fridge (Home → Kitchen)
```graphql
mutation UpdateFridge {
  updateItem(input: {
    id: "YOUR_FRIDGE_ID_HERE"
    allowedActivities: ["eat"]
  }) {
    id
    name
    allowedActivities
  }
}
```

### Stove (Home → Kitchen)
```graphql
mutation UpdateStove {
  updateItem(input: {
    id: "YOUR_STOVE_ID_HERE"
    allowedActivities: ["eat"]
  }) {
    id
    name
    allowedActivities
  }
}
```

### Table (Home → Kitchen) - MULTI-AFFORDANCE
```graphql
mutation UpdateTable {
  updateItem(input: {
    id: "YOUR_TABLE_ID_HERE"
    allowedActivities: ["eat", "chat_friend"]
  }) {
    id
    name
    allowedActivities
  }
}
```

### Bed (Home → Bedroom)
```graphql
mutation UpdateBed {
  updateItem(input: {
    id: "YOUR_BED_ID_HERE"
    allowedActivities: ["sleep"]
  }) {
    id
    name
    allowedActivities
  }
}
```

### Bookshelf (Library → Main)
```graphql
mutation UpdateBookshelfMain {
  updateItem(input: {
    id: "YOUR_BOOKSHELF_MAIN_ID_HERE"
    allowedActivities: ["read"]
  }) {
    id
    name
    allowedActivities
  }
}
```

### Desk (Library → Main)
```graphql
mutation UpdateDesk {
  updateItem(input: {
    id: "YOUR_DESK_ID_HERE"
    allowedActivities: ["write"]
  }) {
    id
    name
    allowedActivities
  }
}
```

### Broken Bookshelf (Library → Main) - NO AFFORDANCES
```graphql
mutation UpdateBrokenBookshelf {
  updateItem(input: {
    id: "YOUR_BROKEN_BOOKSHELF_ID_HERE"
    allowedActivities: []
  }) {
    id
    name
    allowedActivities
  }
}
```

### Bookshelf (Library → Stacks)
```graphql
mutation UpdateBookshelfStacks {
  updateItem(input: {
    id: "YOUR_BOOKSHELF_STACKS_ID_HERE"
    allowedActivities: ["read"]
  }) {
    id
    name
    allowedActivities
  }
}
```

### Bench (Park → Lawn)
```graphql
mutation UpdateBench {
  updateItem(input: {
    id: "YOUR_BENCH_ID_HERE"
    allowedActivities: ["chat_friend", "date"]
  }) {
    id
    name
    allowedActivities
  }
}
```

### Art Installation (Park → Lawn)
```graphql
mutation UpdateArtInstallation {
  updateItem(input: {
    id: "YOUR_ART_INSTALLATION_ID_HERE"
    allowedActivities: ["view_art"]
  }) {
    id
    name
    allowedActivities
  }
}
```

## Step 3: Verify All Affordances

```graphql
query VerifyAffordances {
  region(id: "region-desert-willow") {
    lots {
      name
      indoorRooms {
        name
        items {
          name
          allowedActivities
        }
      }
      outdoorAreas {
        name
        items {
          name
          allowedActivities
        }
      }
    }
  }
}
```

Expected output should show:
- **Fridge**: `["eat"]`
- **Stove**: `["eat"]`
- **Table**: `["eat", "chat_friend"]`
- **Bed**: `["sleep"]`
- **Bookshelf (Main)**: `["read"]`
- **Desk**: `["write"]`
- **Broken Bookshelf**: `[]`
- **Bookshelf (Stacks)**: `["read"]`
- **Bench**: `["chat_friend", "date"]`
- **Art Installation**: `["view_art"]`

## Step 4: Test in Frontend

1. Restart your GraphQL server if needed
2. Navigate to the region overview in the frontend
3. Click the "⚡ Tick" button
4. Check the console for the full state dump
5. Verify character needs are decaying

You're now ready to implement the utility-based decision making logic!
