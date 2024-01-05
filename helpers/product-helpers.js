var db=require('../config/connections')
var collection=require('../config/collections')
///const { Db } = require('mongodb')
var db=require('../config/connections')
const bcrypt=require('bcrypt')
const { response } = require('express')
const async = require('hbs/lib/async')
const { FindCursor, ObjectId } = require('mongodb')
const { reject, promise } = require('bcrypt/promises')

const Razorpay = require('razorpay');
const { resolveCaa } = require('dns')
const { resolve } = require('path')
const { validateWebhookSignature } = require('razorpay')
const collections = require('../config/collections')
///const { default: orders } = require('razorpay/dist/types/orders')


module.exports={
    addProduct(product){
        console.log(product)
       return new Promise((resolve,reject)=>{
        product.createdAt=new Date()
        db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data)=>{
          resolve(data.insertedId)
        })
       })
    },
    getAllProducts(){
       return new Promise(async(resolve,reject)=>{
       var products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
        resolve(products)
       })
    },

    getAllProductsInCategories(){
        return new Promise(async(resolve,reject)=>{
            let productsInCategories=await db.get().collection(collection.ADMIN_TOOLS).aggregate([
                {$match:{tool:'category'}},
                {
                    $unwind:'$Categories'
                },
                {
                    $project:{
                        category:'$Categories.Category'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'category',
                        foreignField:'category',
                        as:'Products'
                    }  
                } ,
                {
                    $project:{
                        category:1,product:'$Products'
                    }
                }
            ]).toArray()
            console.log(productsInCategories)
             resolve(productsInCategories) 
        }) 
    },
    getLateastArrivals(){
        return new Promise(async(resolve,reject)=>{ 
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
                   
             console.log(products)
              
           // let products=await db.get().collection(collection.PRODUCT_COLLECTION).find({isFeatured:'yes'}).sort({ createdAt: -1 }).limit(10).toArray()
           resolve(products) 

           /*   {
                $project:{
                    _id:1,
                    Name:1,
                    category:1,
                    description: 1,
                    price: 1,
                    isFeatured: 1,
                    quantity: 1,
                    totalImages: 1,
                    createdAt:1 
                }
             }*/
        }) 
    },
    deleteProduct(prodId){
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:ObjectId(prodId)})
            resolve()
        }) 

    },
   getProductDetails(prodId){
        return new Promise((resolve,reject)=>{ 
          db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:ObjectId(prodId)}).then((details)=>{
            resolve(details)
          })
            
        })

    },
     updateProduct(prodId,data){
        const updateData = {
            Name: data.Name,
            category: data.category,
            price: data.price,
            description: data.description,
            quantity: data.quantity,
            isFeatured: data.isFeatured
          };
          if (data.totalImages !== null) {
            updateData.totalImages = data.totalImages;
          }
        return new Promise((resolve,reject)=>{ 
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:ObjectId(prodId)},{
                 $set: {  updateData }
            })
            resolve()
        })


    },
   

    changeProductQuantity:async(data,user)=>{
        let count=parseInt(data.count)
        let quantity=parseInt(data.quantity) 
        let newQnty= quantity+count
        console.log('new'+newQnty)
        let product=await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:ObjectId(data.product)})
        let avlbleQnty=product.quantity
        var cart= user?collection.CART_COLLECTION:collection.GUEST_USER_CART_COLLECTION
         
      return new Promise((resolve,reject)=>{ 
        
        if(data.count==-1 && data.quantity==1){
            db.get().collection(cart).updateOne({_id:ObjectId(data.cart) },{
                $pull:{Products:{item:ObjectId(data.product)}}
            }).then((response)=>{
                response.removeProduct=true

               resolve(response)
            })
        }else if(newQnty>avlbleQnty){
              response.maxQuantity=true
              resolve(response)
        }  else{ 
        db.get().collection(cart).updateOne({_id:ObjectId(data.cart),'Products.item':ObjectId(data.product)},
        {
            
          $inc:{'Products.$.quantity':count}  
        }).then((response)=>{
           resolve(response) 

        })
    }
      })
    },
   
 
   
   
    getAllOrderDetails(){
        return new Promise(async(resolve,reject)=>{
         let orderDetails=await  db.get().collection(collection.ORDER_COLLECTION).find().toArray()
         resolve(orderDetails)
        
        })
        
    },
    getThisProduct(ProdId){
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:ObjectId(ProdId)}).then((product)=>{
                resolve(product)
            })
        })
    },
    getProductAmount(prodId){
        return new Promise(async(resolve,reject)=>{
         let product=await  db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:ObjectId(prodId)}) 
        console.log(product)
         resolve(product.price) 
        })
    },
    changeDeliveryStatus(newStatus,orderId){
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).findOneAndUpdate({_id:ObjectId(orderId)},{
                $set:{
                    deliveryStatus:newStatus 
                }
            }).then((response)=>{ 
                resolve(response)
                console.log(newStatus)
                if(newStatus=='Delivered'){
                    response.value.deliveryStatus=newStatus
                    response.value.saleCreatedAt=new Date()
                    db.get().collection(collection.SALES_COLLECTION).insertOne(response.value).then((data)=>{
                        console.log(data.insertedId)
                    }) 
                } 
                   
                
              
                  
            })
        })
    } ,
       getCategoryProducts(category){
         return new Promise ((resolve,reject)=>{
             db.get().collection(collection.PRODUCT_COLLECTION).find({category:category}).toArray().then((products)=>{
                resolve(products)
             })
         })
       },
      
     addFeedBack(data){
       console.log(data)
      
        return new Promise(async(resolve,reject)=>{
           var product=await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:ObjectId(data.product)})
           let ratings= product.ratings
           
           if(ratings){
            console.log('hi')
             
            var totalRating=parseInt(0)
                var avgRating=parseInt(0)
            console.log(totalRating)
            
             for(let i=0;i<ratings.length;i++){
                console.log(ratings[i].rating)
                
               totalRating=totalRating+parseInt(ratings[i].rating) 
             }
             totalRating=totalRating+parseInt(data.rating)
             console.log(totalRating)
             let ratingsLength=parseInt(ratings.length+1)
             console.log(ratingsLength)
             avgRating=totalRating/ratingsLength
            //let avgRating=parseInt(totalRating)+parseInt(data.rating)/parseInt(ratings.length+1)
           
          //  console.log(parseInt(totalRating)+parseInt(data.rating),"ratinglentgh",parseInt(ratings.length+1))
           // console.log("avg",avgRating)
              //  avgRating=parseInt(avgRating)
                console.log("avg",avgRating)
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:ObjectId(data.product)},{
                $push:{ratings:{'rating':data.rating,'feedback':data.feedback}}, 
                $set:{rating:avgRating }
            })
           }else{
            
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:ObjectId(data.product)},{ 
                $push:{ratings:{'rating':data.rating,'feedback':data.feedback}},
                $set:{rating:data.rating} 
            },{ $upsert:true})
           }
        /* return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:ObjectId(data.product)},{
              
            },{upsert:true}).then(()=>{
                resolve()
            })
         })*/  

         resolve()
     })},
     searchProducts(name){
        return new Promise(async(resolve,reject)=>{
           var searchedProducts=await db.get().collection(collection.PRODUCT_COLLECTION).find({
                $or:[
                    {Name:{$regex:name,$options:"i"}},
                    {description:{$regex:name,$options:"i"}}
                ]
            }).toArray()
            console.log("searched products"+searchedProducts)
            
            resolve(searchedProducts)
        })
       
     }
}