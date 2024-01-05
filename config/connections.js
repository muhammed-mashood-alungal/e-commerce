const MongoClient=require('mongodb').MongoClient
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
}
//"mongodb://0.0.0.0:27017/"