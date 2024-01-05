var db=require('../config/connections')
var collection=require('../config/collections')
///const { Db } = require('mongodb')
var db=require('../config/connections')
const bcrypt=require('bcrypt')
const { response } = require('express')
const async = require('hbs/lib/async')
const { ObjectId } = require('mongodb')
const Razorpay = require('razorpay');
const { validateWebhookSignature } = require('razorpay')
var instance = new Razorpay({
    key_id: 'rzp_test_W2SbWn1zeYAOwv',
    key_secret: '0txRYkWiQaiSu6lHpIWZ2lOI',
  });
module.exports={

    doSignup:(userData)=>{
       
        return new Promise (async(resolve,reject)=>{
            console.log(userData)
            let isUserExist= await db.get().collection(collection.USER_COLLECTION).findOne({email:userData.email})
            if(isUserExist){
                resolve({errMsg:'This user is already exist'})
            }else{
               userData.password=await bcrypt.hash(userData.password,10)
            
           db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
            resolve({userId:data.insertedId})
           })  
        }
            }
           
        )    
    }
,
    doLogin:(userData)=>{
        return new Promise(async(resolve, reject) => {
            let loginstatus=false
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({email:userData.email})
             if(user){
                let  response={}
                bcrypt.compare(userData.password,user.password).then(async(status)=>{
                   
                    if (status==true){
                         response.status=true
                         response.user= user
                         console.log('ok success');
                         resolve(response)
                    }
                    else{
                        response.status=false
                        response.err='incorrect password'
                        resolve(response)
                    }
                     
                    
                }) 
             }else{
                response.status=false
                response.err='invalid Email'
                resolve(response)
             }
              
        })
        
    },
    getCartCount(userId){
        return new Promise(async(resolve,reject)=>{
            let count=0
             let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
             if(cart){
             count=cart.Products.length
             }
             resolve(count)
        })
    },
    getGuestCartCount(userId){
        return new Promise(async(resolve,reject)=>{
            let count=0
             
             let cart=await db.get().collection(collection.GUEST_USER_CART_COLLECTION).findOne({user:userId})
             if(cart){
             count=cart.Products.length
             }
             resolve(count)
        })
    },
    changeCartCollection(guestUserId,userId){ 
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.GUEST_USER_CART_COLLECTION).findOne({user:guestUserId}).then((cart)=>{
                if(cart){
                    Products=cart.Products
                  /*  let cartObj={
                        user:ObjectId(userId), 
                        Products:Products
                    }*/
                 
                    db.get().collection(collection.CART_COLLECTION).findOneAndUpdate({user:ObjectId(userId)},  
                    {
                        $set:{
                            Products:Products
                        }
                    },{
                        upsert:true
                    }) 
 
                } 
                resolve() 
             

            })
        })
    },
    getCartProducts(userId){
        console.log('this is get cart function:',userId)
        return new Promise(async(resolve,reject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:ObjectId(userId)}
                },{ 
                    $unwind:'$Products'
                },
                {
                    $project:{
                        item:'$Products.item',
                        quantity:'$Products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'Product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$Product',0]}
                    }
                }

            ]).toArray()
              console.log('cartitems'+cartItems[0]);
             resolve(cartItems)
        })

    },
    getTotalAmount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let total=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:userId}
                },{
                    $unwind:'$Products'
                },
                {
                    $project:{
                        item:'$Products.item',
                        quantity:'$Products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'Product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$Product',0]}
                    }
                },
               {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity',{$toInt:'$product.price'}]}}
                    }
                }

            ]).toArray() 
             if(total==0){
                resolve()
             }else{
                resolve(total[0].total)
                
             }
             
        })

    },
    
    getGuestCartProducts(userId){
        return new Promise(async(resolve,reject)=>{
            let cartItems=await db.get().collection(collection.GUEST_USER_CART_COLLECTION).aggregate([
                {
                    $match:{user:userId}
                },{
                    $unwind:'$Products'
                },
                {
                    $project:{
                        item:'$Products.item',
                        quantity:'$Products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'Product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$Product',0]}
                    }
                }

            ]).toArray()
              console.log('cartitems:'+cartItems[0]);
             resolve(cartItems)
        })
    },
    getGuestCartTotalAmount(userId){
        return new Promise(async(resolve,reject)=>{
            let total=await db.get().collection(collection.GUEST_USER_CART_COLLECTION).aggregate([
                {
                    $match:{user:userId}
                },{
                    $unwind:'$Products'
                },
                {
                    $project:{
                        item:'$Products.item',
                        quantity:'$Products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'Product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$Product',0]}
                    }
                },
               {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity',{$toInt:'$product.price'}]}}
                    }
                }

            ]).toArray() 
             if(total==0){
                resolve()
             }else{
                resolve(total[0].total)
                
             }
             
        })
    },
    
    addToCart(prodId,userId){
        let response={}
        let proObj={
            item:ObjectId(prodId),
            quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
            if(userCart){
                let proExist=userCart.Products.findIndex( product=> product.item==prodId)
                  
                 if(proExist!==-1){
                   response.proExist=true
              
              db.get().collection(collection.CART_COLLECTION).updateOne({user:ObjectId(userId),'Products.item':ObjectId(prodId)},
                    {
                      $inc:{'Products.$.quantity':1}  
                    }).then(()=>{
                        resolve(response)
                        
                    })
                 }else{
                    response.proExist=false
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:ObjectId(userId)},{
                        $push:{Products:proObj}
                    }).then(()=>{
                        resolve(response) 
                    })
                 } 
            }else{ 
                response.proExist=false
                let cartObj={
                    user:ObjectId(userId),
                    Products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then(()=>{
                    resolve(response)
                })
            }
        })

    },
        addToGuestCart(prodId,userId){
        let response={}
        let proObj={
            item:ObjectId(prodId),
            quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            let guestUserCart=await db.get().collection(collection.GUEST_USER_CART_COLLECTION).findOne({user:userId})
            if(guestUserCart){
                let proExist=guestUserCart.Products.findIndex( product=> product.item==prodId)
                  console.log(proExist)
                 if(proExist!==-1){
                   response.proExist=true
                    db.get().collection(collection.GUEST_USER_CART_COLLECTION).updateOne({user:userId,'Products.item':ObjectId(prodId)},
                    {
                      $inc:{'Products.$.quantity':1}  
                    }).then(()=>{
                        resolve(response)
                        
                    })
                 }else{
                    response.proExist=false
                    db.get().collection(collection.GUEST_USER_CART_COLLECTION).updateOne({user:userId},{
                        $push:{Products:proObj}
                    }).then(()=>{
                        resolve(response) 
                    }) 
                 } 
            }else{ 
                response.proExist=false
                let cartObj={   
                    user:userId,
                    Products:[proObj]
                }
                db.get().collection(collection.GUEST_USER_CART_COLLECTION).insertOne(cartObj).then(()=>{
                    resolve(response)
                })
            }
        })

    },
    placeOrder(orderDetails,products,total){
        var now =new Date()
        console.log(now)
      //  var date = now.toLocaleDateString();
      //  var time = now.toLocaleTimeString();
        let status=orderDetails['payment-method']==='COD'?'PLACED':'PENDING'
      return new Promise((resolve,reject)=>{
       let  orderObj={
            user:orderDetails['user'],
            status:status,
            CreatedAt:now,
            orderDetails:{
              address:orderDetails.address,
              mobile:orderDetails['mob-no'],
              pinCode:orderDetails['pin-code']
            },
            paymentMethod:orderDetails['payment-method'],
            Products:products,
            total:total,
            deliveryStatus:'Ordered', 
        } 
      
            if(status=='PLACED'){
                
                   products.forEach(async element => { 
                    var {item,quantity}=element 
                    console.log(element)
                    db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:item}).then((product)=>{
                        crntQuantity=product.quantity
                        quantity=crntQuantity-quantity
                        var now=new Date()
                        
                        console.log(quantity)
                        db.get().collection(collection.PRODUCT_COLLECTION).updateOne(
                            {_id:item},  
                             {$set:{quantity:quantity}}
                        )
                        if(quantity==0){
                            ///db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:product._id})
                            let   notifyObj={
                                createdAt:now,
                                message:product.Name+'is stock outed ',
                                product:product
                                
                           }
                           db.get().collection(collection.ADMIN_NOTIFICATIONS).insertOne(notifyObj)
                        }else if(quantity<3){
                          let   notifyObj={
                                 createdAt:now,
                                 message:product.Name+' is showing less quantity that'+quantity ,
                                 product:product
                            }
                            db.get().collection(collection.ADMIN_NOTIFICATIONS).insertOne(notifyObj)
                        }

                        
                    })
                   
                  })
                  db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((data)=>{
                    resolve(data.insertedId)
                  })
                  
                }
                db.get().collection(collection.CART_COLLECTION).deleteOne({user:ObjectId(orderDetails['user'])})
             })
                 
              /**var res=await  db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{_id:orderId}
                },
                {
                    $project:{
                        item:'$Products.item',
                        quantity:'$Products.quantity' 
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'Product'
                    }
                },{
                    $project:{
                      item:1,quantity:1
                    }
                }
                
              ])
            console.log(res[0].res+'hey')
             */
           
    },
    generateRazorepay(orderId,total){
        return new Promise((resolve,reject)=>{
            var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+orderId
              };
              instance.orders.create(options, function(err, order) {
                if(err){
                    console.log(err);
                }  
                    resolve(order)
                    console.log("new order:",order);   
              });
              
        })
    },
    
    getcartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
          let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
           resolve(cart.Products)
           console.log(cart.Products)
      })
  
      },
      verifyPayment(details){
        return new Promise((resolve,reject)=>{
         var crypto = require('crypto');
         var hmac = crypto.createHmac('sha256','0txRYkWiQaiSu6lHpIWZ2lOI');
         hmac = hmac.update(details['response[razorpay_order_id]']+'|'+details['response[razorpay_payment_id]'])
         hmac=hmac.digest('hex') 
         if(hmac==details['response[razorpay_signature]']){
             resolve() 
         }else{
             reject() 
         }
        })
     },
      
   
    getOrderDetails(userId){
        return new Promise(async(resolve,reject)=>{
        let details=await  db.get().collection(collection.ORDER_COLLECTION).find({user:userId}).toArray()
           let num =details.length 
           if(num){
           for(i=0;i<num;i++){ 
              details[i].status= details[i].deliveryStatus
              if(details[i].status=='Ordered'){
                  details[i].statusWidth=5
              }
              else if(details[i].status=='Shipped'){
                  details[i].statusWidth=50
              }
              else if(details[i].status=='Delivered'){
                  details[i].statusWidth=100
              }
           }
          }
          resolve(details)
          console.log(details)
        })
      },
    changePaymentStatus(orderId){
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:ObjectId(orderId)},{
                $set:{status:'PLACED'}
            })
           
        })
    },
    
 
    getOrderProducts(orderId){
        return new Promise(async(resolve,reject)=>{
           
            let orderItems=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{_id:ObjectId(orderId)}
                },{
                    $unwind:'$Products'
                },
                {
                    $project:{
                        item:'$Products.item',
                        quantity:'$Products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'Product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$Product',0]}
                    }
                }

            ]).toArray() 
           resolve(orderItems)
           
        })
    },
    cancelOrder(orderId){ 
        var response={}
        return new Promise(async(resolve,reject)=>{
          var order=await db.get().collection(collection.ORDER_COLLECTION).findOne({_id:ObjectId(orderId)})
          let isJustOrdered=order.deliveryStatus==='Ordered'?true:false
          if(isJustOrdered){
            console.log('hi')
            db.get().collection(collection.ORDER_COLLECTION).deleteOne({_id:ObjectId(orderId)}).then(()=>{
              response.message='Order Cancelled '
              response.status=true
              resolve(response)
            })
          }else{
            response.message='Sorry, we Cannot cancel your becuase it is already '+order.deliveryStatus
            resolve(response)
          }
        })
       },
    removeFromCart(data,user){
        let cart=user?collection.CART_COLLECTION:collection.GUEST_USER_CART_COLLECTION
        console.log(data.userId)
        console.log('car:'+cart,'user:'+user)
         return new Promise((resolve,reject)=>{
             console.log(data)
             db.get().collection(cart).updateOne({user:data.userId},{
                 $pull:{Products:{item:ObjectId(data.prodId)}}
             }).then((response)=>{
                 resolve() 
             })
         })
     },

    removeUser(UserId){
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION).deleteOne({_id:ObjectId(UserId)}).then(()=>{
                resolve()
            }) 
        })
    },
    clearDeliveredOrCancelledOrders(user){
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).deleteMany({user:user,$or:[{deliveryStatus:'Cancelled'},{deliveryStatus:'Delivered'}]}).then(()=>{
                resolve()
                })
        })


    }
     
}