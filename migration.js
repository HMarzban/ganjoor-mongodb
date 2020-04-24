const mysql = require('mysql');
const mongodb = require('mongodb')
const ObjectID = mongodb.ObjectID;
const MongoClient = mongodb.MongoClient;

const mapCollection = []
const MYSQL_HOST = 'localhost'
const MYSQL_USER = 'root'
const MYSQL_DATABASE = 'ganjoor'
const MONGODB_URL = 'mongodb://localhost:27017/ganjoor'

const connection = mysql.createConnection({host : MYSQL_HOST, user : MYSQL_USER, database : MYSQL_DATABASE});
const mongoClient = new MongoClient(MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
connection.connect();


mongoClient.connect(async function (err) {
  if (err) throw err;
  const db = mongoClient.db();
  console.info("MONGO: Connected successfully to server");
  try {
    await db.dropDatabase()
    await migrationPoets(db)
    await migrationVerses(db)
  } catch (error) {
    console.log(error)
  }
})

const migrationPoets = (db) => {
  return new Promise(async resolve => {
    const Poets = await db.createCollection("Poets")
    Poets.createIndex({ "Poems._id": 1 })
    await Poets2Mongo(Poets)
    await PoetsCleanSchema(Poets)
    resolve(true)
  })
}

const Poets2Mongo = (Poets) => {
  return new Promise(resolve => {
    const totalQuery = `
      SELECT COUNT(*) FROM poets 
      INNER JOIN categories ON poets.id = categories.poetId 
      ORDER BY poetId, hierarchyLevel
    `
    connection.query(totalQuery, async (error, results, fields) => {
      if (error) throw error;

      const total = results[0]['COUNT(*)'];
      const limit = 600;
      const pages = Math.ceil(total / limit)
      let totalInserted = 0

      for(let [i, val] of Array(pages).entries()) {
        let offset = i==0 ? 0 : limit * i;
        console.info("offset:", offset,"limit:", limit, `page: ${i}/${pages}-${total}`);

        const query = `
          SELECT * FROM poets 
          INNER JOIN categories ON poets.id = categories.poetId 
          ORDER BY poetId, hierarchyLevel
          LIMIT ${limit} OFFSET ${offset}
        `
        const results = await SQLexcuteQuery(query)
        // console.info("mysql result: ", results.length)
        if(results.length) {
          const Mresult = await Poets.insertMany(results)
          // console.info("inset to mongo: ", Mresult.result.n)
          totalInserted += Mresult.result.n
        }
        if(totalInserted === total){
          console.info("Poets2Mongo migration done.")
          resolve(true)
        }
      }
    })
  })
}

const PoetsCleanSchema = (Poets) => {
  return new Promise(async resolve => {
    const dataresult = await Poets.aggregate([
        {"$group" : {
          "_id" : "$poetId",
          "desc" : { "$first" : "$description" },
          "name" : { "$first" : "$name" },
          "poems" : {
            "$push" : { 
              "name" : "$name",
              "_id": "$id"
            }
          }
      }},
      {$project: {
        "_id": 1, "desc": 1, "name": 1, "slug": 1,
        "poems": { "$slice": [ "$poems", 1, {"$size": "$poems"} ]} 
      }}
    ],{ allowDiskUse: true }).toArray()
    
    await Poets.drop()
    dataresult.forEach((el, index) => {
      dataresult[index]._id = ObjectID()
      dataresult[index]["slug"] = slugify(el.name,{lower: false,strict: false})
      const poet = { name: el.name, _id: el._id }
      dataresult[index].poems = dataresult[index].poems.map(x =>{
        const id = {old: x._id, new: ObjectID(), poet}
        mapCollection.push(id)
       return Object.assign(x, {_id: id.new ,slug: slugify(x.name,{lower: false,strict: false}) })
      })
    });
    const result = await Poets.insertMany(dataresult)

    console.log("PoetsCleanSchema Done.", result.result)
    resolve(true)
  })
}

const migrationVerses = (db) => {
  return new Promise(async resolve => {
    const Verses = await db.createCollection("Verses")
    Verses.createIndex({ "poemId": 1 })
    await Verses2Mongo(Verses)
    await VersesCleanSchema(Verses)
    resolve(true)
  })
}

const Verses2Mongo = (Verses) => {
  return new Promise(resolve => {
    const totalQuery = `
      SELECT COUNT(*) from poems
      INNER JOIN verses WHERE poems.id = verses.poemId
    `
    connection.query(totalQuery, async (error, results, fields) => {
      if (error) throw error;

      const total = results[0]['COUNT(*)'];
      const limit = 300000;
      const pages = Math.ceil(total / limit)
      let totalInserted = 0

      for(let [i, val] of Array(pages).entries()) {
        let offset = i==0 ? 0 : limit * i;
        console.info("offset:", offset,"limit:", limit, `page: ${i}/${pages}-${total}`);

        const query = `
          SELECT * from poems
          INNER JOIN verses WHERE poems.id = verses.poemId
          LIMIT ${limit} OFFSET ${offset}
        `
        const results = await SQLexcuteQuery(query)
        // console.info("mysql result: ", results.length)
        if(results.length) {
          const Mresult = await Verses.insertMany(results)
          // console.info("inset to mongo: ", Mresult.result.n)
          totalInserted+=Mresult.result.n
        }
        if(totalInserted === total){
          console.info("Verses2Mongo migration Done.")
          resolve(true)
        }
      }
    })
  })
}

const VersesCleanSchema = (Verses) => {
  return new Promise(async resolve => {
    const dataresult = await Verses.aggregate([
      {$group:{
        _id: {poemId: "$categoryId",poem: "$poemId"},
        tile: {$first: "$title"},
        verses: {$push: {
        text: "$text"
        }}
      }}
    ],{ allowDiskUse: true }).toArray()
    dataresult.forEach((el, index) => {
      dataresult[index]["slug"] = slugify(el.tile,{lower: false,strict: false})
      const ids = mapCollection.find(x => x.old ==  dataresult[index]._id.poemId ) || {}
      dataresult[index].poet = ids.poet
      dataresult[index]._id = ObjectID()
      dataresult[index].poemId = ObjectID(ids.new) 
    });
    
    await Verses.drop()
    const result = await Verses.insertMany(dataresult)

    console.log("VersesCleanSchema Done.", result.result)
    resolve(true)
  })
}

const SQLexcuteQuery = (query) => {
  return new Promise((resolve, reject) => {
    connection.query(query, async (error, results, fields) => {
      if (error) throw error;
      resolve(results)
    })
  });
}

function slugify(titleStr){
  titleStr = titleStr.replace(/^\s+|\s+$/g, '');
  titleStr = titleStr.toLowerCase();
  titleStr = titleStr.replace(/[^a-z0-9_\s-ءاأإآؤئبتثجحخدذرزسشصضطظعغفقكلمنهويةى]#u/, '')
    .replace(/\s+/g, '-') // Collapse whitespace and replace by -
    .replace(/-+/g, '-') // Collapse dashes
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
      
  return titleStr;       
}