## Dataset migration utility

This is a migration of a bundled Ganjoor dataset, not a continuously synchronized database. Record the source dump date and compare document counts before relying on a new migration. The bundled data has not been refreshed by this documentation update.

# [Ganjoor](https://ganjoor.net/) migration mysql db to mongodb

> Note: before hit `yarn start` be sure to import `./db/dump.sql.gz` to your local database

**Before running:** `migration.js` connects to the local MongoDB database `ganjoor` and drops that entire database before importing. Run only against a disposable local instance, or edit the connection and migration behavior first. Preserve any existing data separately.

```sh
$ yarn install      # install dependencies

$ yarn start        # start the migration process
$ yarn export:db    # export ganjoor mongodb dataset
$ yarn import:db    # import ganjoor mongodb dataset to your local db
$ yarn import:sql   # import ganjoor mysql database to your local db

```

## Collection Schema

It has two collections `Poets` and `Verses`

### Poets collection schema

```js
[
  {
    "_id" : ObjectId,
    "desc" : String,
    "name" : String,
    "poems" : [
      {
        "_id" : ObjectId,
        "name" : String,
        "slug" : String
      },
      ...
    ]
  }
]
```

### Verses collection schema

```js
[
  {
    "_id": ObjectId,
    "tile": String,
    "slug": String,
    "poemId": ObjectId,
    "poet": {
      "_id": ObjectId
      "name": String
    }
    "verses": [
      {
        "text": String
      },
      ...
    ]
  }
]
```

## More about ganjoor open source project
- [Github page](https://github.com/ganjoor)
- [Databse](https://github.com/ganjoor/ganjoor-db)
