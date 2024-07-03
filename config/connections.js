/*const MongoClient=require('mongodb').MongoClient
const state={
    db:null
}
module.exports.connect=function(done){
    const url='mongodb://127.0.0.1:27017/'
    const dbname='product'
    

    MongoClient.connect(url,(err,data)=>{
        if (err) return done(err)
        state.db=data.db(dbname)
        done()
    })
   
}

module.exports.get=function(){
 return state.db
}*/
//"mongodb://0.0.0.0:27017/"

 
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://newuser:newpassword@cluster2.plvqzif.mongodb.net/?retryWrites=true&w=majority&appName=Cluster2";
//const uri = "mongodb+srv://muhdmashoodalungal:0987654321@cluster2.plvqzif.mongodb.net/?retryWrites=true&w=majority&appName=Cluster2";

const client = new MongoClient(uri);
const state={
    db:null
}
module.exports.connect = async function () {
    try {
        await client.connect();
        console.log("Connected successfully to MongoDB Atlas");
         state.db = client.db("webstore_db");
        return db;
    } catch (err) {
        console.error("Error connecting to MongoDB Atlas:", err);
        throw err; // Rethrow the error to indicate connection failure
    }
};

module.exports.get = function () {
    return state.db;
};

/*

mongodb+srv://muhdmashoodalungal:<password>@cluster2.plvqzif.mongodb.net/
*/