# [Ganjoor](https://ganjoor.net/) migration mysql db to mongodb

> Note: before hit `yarn start` be sure to import `./db/dump.sql.gz` to your local database

```sh
$ yarn i            # install dependency

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
