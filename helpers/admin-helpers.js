var db=require('../config/connections')
var collection=require('../config/collections')
const bcrypt=require('bcrypt')
var superAdmin=require('../config/superAdmin')
const { response } = require('express')
const async = require('hbs/lib/async')
const { reject } = require('bcrypt/promises')
const { ObjectId } = require('mongodb')
module.exports={
 doLogin:(data)=>{
   return new Promise(async(resolve,reject)=>{
  let adminName=await superAdmin.ADMIN_USERNAME
  let password=await superAdmin.ADMIN_PASSWORD
   
   
   ////console.log(data.user_name+"plus"+superAdmin.ADMIN_USERNAME)
   /// superAdmin.ADMIN_USERNAME=await bcrypt.hash(superAdmin.ADMIN_USERNAME,10)
   /// superAdmin.ADMIN_PASSWORD=await bcrypt.hash(superAdmin.ADMIN_PASSWORD,10)
      
     bcrypt.compare(data.adminName,adminName).then((status)=>{
        if(status==true){ 
          
            bcrypt.compare(data.password,password).then((response)=>{
              if(response==true){
                resolve({status:true})
                
              }else{
                reject('Incorrect Password')
              } 
            }) 
        }else{
         reject('Invalid user Name')
        }
     })
   })
 },
 getAllUsers(){
  return new Promise((resolve,reject)=>{
    db.get().collection(collection.USER_COLLECTION).find().toArray().then((users)=>{
      console.log(users)
      resolve(users)
    })
  })
  
 },
 addCategory(newCategory){
  return new Promise ( (resolve,reject)=>{
    db.get().collection(collection.ADMIN_TOOLS).updateOne({tool:'category'},{$push:{Categories:newCategory}},{upsert:true}).then(()=>{ 
      resolve()
    })
  })
 },
 getAllCategories(){
     return new Promise(async(resolve,reject)=>{
     let categoryDocument=await db.get().collection(collection.ADMIN_TOOLS).findOne({tool:'category'})
        let Categories=await categoryDocument.Categories
       console.log(categoryDocument.Categories,Categories,categoryDocument)
       resolve(Categories) 
       
     })
    },
 addBannerimage(imageName){
  imageName={imageName:imageName}
  return new Promise((resolve,reject)=>{
    db.get().collection(collection.ADMIN_TOOLS).updateOne({tool:'banner'},{
      $push:{images:imageName}
    },{upsert:true})
  }).then(()=>{
    resolve()
  })
 },
 getBannerImages(){
  var bannerImages={}
  return new Promise((resolve,reject)=>{
    db.get().collection(collection.ADMIN_TOOLS).findOne({tool:'banner'}) .then((banner)=>{
      if(banner){
        bannerImages=banner.images
        resolve(bannerImages)
        console.log('hhhey')
      }
      resolve()
     
    })
  })
 },
 deleteBannerImage(imgName){
  return new Promise((resolve,reject)=>{
    db.get().collection(collection.ADMIN_TOOLS).updateOne({tool:'banner'},{
      $pull:{images:{imageName:imgName}}
    }).then(()=>{
      resolve()
      console.log('done')
    })
  })
 },
 deleteCategory(categoryname){
  return new Promise((resolve,reject)=>{
    db.get().collection(collection.ADMIN_TOOLS).updateOne({tool:'category'},{
      $pull:{Categories:{Category:categoryname}}
    }).then(()=>{
      resolve()
      console.log('done')
    })
  })
 },
 getCustomersCount(){
  return new Promise(async(resolve,reject)=>{
   let count=await db.get().collection(collection.USER_COLLECTION).countDocuments({})
   resolve(count)
  })
 },
 getpendingOrders(){
  return new Promise(async(resolve,reject)=>{
    let count=await db.get().collection(collection.ORDER_COLLECTION).countDocuments()
    resolve(count)
  })
 },
 getTodaysSalesAmount(){
  const today = new Date();
today.setHours(0, 0, 0, 0); // Set the time to the start of today
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1); // Set the time to the start of tomorrow

  let td = new Date()
  var dateofToday = today.toLocaleDateString(); 
   console.log(dateofToday)
  return new Promise(async(resolve,reject)=>{
    var  todaysSales=await db.get().collection(collection.SALES_COLLECTION).aggregate([ 
      {
        $match: {
          $expr: {
            $and: [
              { $gte: ["$saleCreatedAt", today] }, // Greater than or equal to start of today
              { $lt: ["$saleCreatedAt", tomorrow] } // Less than start of tomorrow
            ]
          }
        }
        
      },
      {
        $group: {
          _id: null,
          totalSalesAmount:{$sum:{$toInt:'$total'}} // Calculate the sum of sales amount
        }
      }
    ]).toArray()
  if(todaysSales[0]){
    resolve(todaysSales[0].totalSalesAmount)
  }else{
    resolve(0)
  }
   
    
  })
  
 },
 getTotalRevenue(){
  return new Promise(async(resolve,reject)=>{
     let total= await db.get().collection(collection.SALES_COLLECTION).aggregate([
       {
        $group: {
          _id: null,
          totalSales: { $sum:{$toInt:'$total'} }
        }
      }

    ]).toArray()
     if(total[0]){
      resolve(total[0].totalSales)
     }else{
      resolve()
     }
    
  })
 },
 getNotifications(){
  return new Promise (async(resolve,reject)=>{
    let notification=await db.get().collection(collection.ADMIN_NOTIFICATIONS).find().sort({createdAt:-1}).toArray()
    resolve(notification)
  })
 },
 removeOnenotification(id){
  return new Promise((resolve,reject)=>{
    db.get().collection(collection.ADMIN_NOTIFICATIONS).deleteOne({_id:ObjectId(id)}).then(()=>{
      resolve()
    })
  })
 },
 clearNotifications(){
  return new Promise((resolve,reject)=>{
    db.get().collection(collection.ADMIN_NOTIFICATIONS).deleteMany({}).then(()=>{
      resolve()
    })
  })
 },
 cancelthisOrder(orderId,reason){
  return new Promise((resolve,reject)=>{
    db.get().collection(collection.ORDER_COLLECTION).findOneAndUpdate({_id:ObjectId(orderId)},{ 
      $set:{deliveryStatus:'Cancelled',cancelReason:reason},
      
    }).then((response)=>{
      resolve()
      response.value.cancelCreatedAt=new Date()
      response.value.cancelReason=reason
      db.get().collection(collection.CANCELLED_ORDERS).insertOne(response.value).then((data)=>{
          console.log(data.insertedId)
      }) 
    })
    
  })
 },
 getAllOrderDetailsforAdmin(){ 
  return new Promise(async(resolve,reject)=>{
   let orderDetails=await  db.get().collection(collection.ORDER_COLLECTION).find({$or:[{deliveryStatus:'Ordered'},{deliveryStatus:'Shipped'}]}).toArray()
   resolve(orderDetails)
  
  })
  
},
getAllCancelledOrders(){
  return new Promise(async(resolve,reject)=>{
    let CancelledOrderDetails=await  db.get().collection(collection.CANCELLED_ORDERS).find().toArray()
    resolve(CancelledOrderDetails)
   
   })
},
getAllDeliveredOrders(){
  return new Promise(async(resolve,reject)=>{
    let deliveredOrderDetails=await  db.get().collection(collection.SALES_COLLECTION).find().toArray()
    resolve(deliveredOrderDetails)
   
   })
},
getTodaysSalesDetails(){
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set the time to the start of today
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Promise(async(resolve,reject)=>{
    let sales=await db.get().collection(collection.SALES_COLLECTION).aggregate([ 
      {
        $match: {
          $expr: {
            $and: [
              { $gte: ["$saleCreatedAt", today] }, // Greater than or equal to start of today
              { $lt: ["$saleCreatedAt", tomorrow] } // Less than start of tomorrow
            ]
          }
        }
        
      }
    ]).toArray()
    console.log(sales)
    resolve(sales)
  })
},
getAllSalesDetails(){
  return new Promise (async(resolve, reject)=>{
    let allSales=await db.get().collection(collection.SALES_COLLECTION).find().toArray()
    resolve(allSales)
  })
},
getOrderDetails(orderId){
 return new Promise((resolve,reject)=>{
  db.get().collection(collection.ORDER_COLLECTION).findOne({_id:ObjectId(orderId)}).then(async(details)=>{
    let user =await db.get().collection(collection.USER_COLLECTION).findOne({_id:ObjectId(details.user)})
    details.userName=user.name
    resolve(details)
  })
 })
}
}
