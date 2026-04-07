-- Node tables
CREATE NODE TABLE IF NOT EXISTS World(
  id STRING, name STRING, createdAt TIMESTAMP, PRIMARY KEY(id)
);

CREATE NODE TABLE IF NOT EXISTS Region(
  id STRING, name STRING, worldId STRING, kind STRING, PRIMARY KEY(id)
);

CREATE NODE TABLE IF NOT EXISTS Lot(
  id STRING, name STRING, lotType STRING, PRIMARY KEY(id)
);

CREATE NODE TABLE IF NOT EXISTS LotTemplate(
  id STRING, name STRING, lotType STRING, description STRING, tags STRING[],
  indoorRooms STRING, outdoorAreas STRING,
  PRIMARY KEY(id)
);

CREATE NODE TABLE IF NOT EXISTS HouseholdTemplate(
  id STRING, name STRING, description STRING, tags STRING[],
  characters STRING, animals STRING,
  PRIMARY KEY(id)
);

CREATE NODE TABLE IF NOT EXISTS Space(
  id STRING, name STRING, description STRING, isIndoor BOOL, PRIMARY KEY(id)
);

CREATE NODE TABLE IF NOT EXISTS Household(
  id STRING, name STRING, PRIMARY KEY(id)
);

CREATE NODE TABLE IF NOT EXISTS Item(
  id STRING, name STRING, description STRING,
  itemRoles STRING[], comfort DOUBLE,
  canBeUsedByHumans BOOL, canBeUsedByAnimals BOOL,
  minimumAgeToUse INT64, maxSimultaneousUsers INT64,
  satisfiesNeeds STRING[], allowedActivities STRING[],
  canStoreItems BOOL, cost INT64, count INT64,
  PRIMARY KEY(id)
);

CREATE NODE TABLE IF NOT EXISTS Memory(
  id STRING, content STRING, createdAt TIMESTAMP,
  eventType STRING,
  locationLotId STRING, locationLotName STRING,
  locationSpaceId STRING, locationSpaceName STRING,
  relationshipIds STRING[],
  PRIMARY KEY(id)
);

CREATE NODE TABLE IF NOT EXISTS Trait(
  id STRING, name STRING, description STRING,
  -- store modifiers as lists of structs in JSON-ish strings if desired later; start simple
  PRIMARY KEY(id)
);

CREATE NODE TABLE IF NOT EXISTS Value(
  id STRING, name STRING, description STRING, PRIMARY KEY(id)
);

CREATE NODE TABLE IF NOT EXISTS Character(
  id STRING, name STRING, age INT64, bio STRING, workSchedule STRING[],
  PRIMARY KEY(id)
);

CREATE NODE TABLE IF NOT EXISTS Animal(
  id STRING, name STRING, age INT64, traits STRING[], bio STRING,
  PRIMARY KEY(id)
);

CREATE NODE TABLE IF NOT EXISTS ActivityType(
  id STRING, name STRING, description STRING, defaultDurationMinutes INT64,
  PRIMARY KEY(id)
);

CREATE NODE TABLE IF NOT EXISTS Activity(
  id STRING, startedAt TIMESTAMP, status STRING, note STRING,
  PRIMARY KEY(id)
);

CREATE NODE TABLE IF NOT EXISTS Employer(
  id STRING, companyName STRING, industry STRING, PRIMARY KEY(id)
);

CREATE NODE TABLE IF NOT EXISTS Employment(
  id STRING, position STRING, salary INT64, PRIMARY KEY(id)
);

-- Relationship tables (structure)
CREATE REL TABLE IF NOT EXISTS HAS_REGION(FROM World TO Region);
CREATE REL TABLE IF NOT EXISTS HAS_LOT(FROM Region TO Lot);
CREATE REL TABLE IF NOT EXISTS HAS_SPACE(FROM Lot TO Space);

-- Household / occupancy
CREATE REL TABLE IF NOT EXISTS IN_HOUSEHOLD(FROM Character TO Household);
CREATE REL TABLE IF NOT EXISTS ANIMAL_IN_HOUSEHOLD(FROM Animal TO Household);
CREATE REL TABLE IF NOT EXISTS HOUSEHOLD_AT(FROM Household TO Lot); -- current lot
CREATE REL TABLE IF NOT EXISTS HOME(FROM Character TO Lot);
CREATE REL TABLE IF NOT EXISTS ANIMAL_HOME(FROM Animal TO Lot);
CREATE REL TABLE IF NOT EXISTS AT(FROM Character TO Lot, at TIMESTAMP);
CREATE REL TABLE IF NOT EXISTS ANIMAL_AT(FROM Animal TO Lot, at TIMESTAMP);

-- Items: containment, ownership, usage
CREATE REL TABLE IF NOT EXISTS CONTAINS(FROM Item TO Item); -- item-in-item
CREATE REL TABLE IF NOT EXISTS ON_SPACE(FROM Item TO Space);
CREATE REL TABLE IF NOT EXISTS ON_LOT(FROM Item TO Lot);
CREATE REL TABLE IF NOT EXISTS OWNS(FROM Character TO Item, acquiredAt TIMESTAMP);
CREATE REL TABLE IF NOT EXISTS USING(FROM Character TO Item, since TIMESTAMP);

-- Traits & values
CREATE REL TABLE IF NOT EXISTS HAS_TRAIT(FROM Character TO Trait);
CREATE REL TABLE IF NOT EXISTS HAS_VALUE(FROM Character TO Value);

-- Memories
CREATE REL TABLE IF NOT EXISTS HAS_LONG_TERM_MEMORY(FROM Character TO Memory);
CREATE REL TABLE IF NOT EXISTS HAS_SHORT_TERM_MEMORY(FROM Character TO Memory);

-- Family & pets
CREATE REL TABLE IF NOT EXISTS PARENT_OF(FROM Character TO Character);
CREATE REL TABLE IF NOT EXISTS OWNS_ANIMAL(FROM Character TO Animal);
CREATE REL TABLE IF NOT EXISTS ANIMAL_PARENT_OF(FROM Animal TO Animal);

-- Employment
CREATE REL TABLE IF NOT EXISTS EMPLOYMENT(FROM Character TO Employment);
CREATE REL TABLE IF NOT EXISTS EMPLOYED_BY(FROM Employment TO Employer);
CREATE REL TABLE IF NOT EXISTS LOCATED_AT(FROM Employer TO Lot);

-- Activities now
CREATE REL TABLE IF NOT EXISTS PERFORMS(FROM Character TO Activity);
CREATE REL TABLE IF NOT EXISTS INSTANCE_OF(FROM Activity TO ActivityType);
CREATE REL TABLE IF NOT EXISTS ACTIVITY_AT(FROM Activity TO Lot);

-- Relationship as node (supports Character↔Character, Character↔Animal, Animal↔Animal)
CREATE NODE TABLE IF NOT EXISTS Relationship(
  id STRING,
  fromCharacterId STRING, toCharacterId STRING,
  shortTermScore DOUBLE, longTermScore DOUBLE,
  labels STRING[],
  lastSeenAt TIMESTAMP, lastSpokeAt TIMESTAMP,
  isDeceasedTarget BOOL,
  relationshipType STRING, relationshipDepth STRING,
  longTermCloseness INT64, shortTermCloseness INT64,
  PRIMARY KEY(id)
);
CREATE REL TABLE IF NOT EXISTS FROM_CHARACTER(FROM Relationship TO Character);
CREATE REL TABLE IF NOT EXISTS FROM_ANIMAL(FROM Relationship TO Animal);
CREATE REL TABLE IF NOT EXISTS TO_CHARACTER(FROM Relationship TO Character);
CREATE REL TABLE IF NOT EXISTS TO_ANIMAL(FROM Relationship TO Animal);
CREATE REL TABLE IF NOT EXISTS REL_HAS_MEMORY(FROM Relationship TO Memory);
