var express = require('express');
var router = express.Router();
const productHelpers= require('../helpers/product-helpers')
var collection=require('../config/collections')
/* GET home page. */
var userHelpers=require('../helpers/user-helpers');
const { response, application, query } = require('express');
const session = require('express-session');
const async = require('hbs/lib/async');
const { prototype } = require('express-fileupload/lib/uploadtimer');
const { ObjectId, ClientSession, ServerSession } = require('mongodb');
const cookieParser = require('cookie-parser');
const {v4:uuidv4}=require('uuid');
const adminHelpers = require('../helpers/admin-helpers');
const { getAllProducts } = require('../helpers/product-helpers');
const verifyLogin= (req,res,next)=>{ 
   if(session.userLoggedIn==true){
    next()
   }
   else{
    session.OnpageLoading=true
    res.redirect('/login')
   }
}
 

router.get('/', function(req, res, next) {
   
  productHelpers.getLateastArrivals().then(async(products)=>{
    var user =session.user 
    session.sessionID="5d9e2402-4120-4ea3-9918-196c44c09650" 
  
   /* if(sessionID==undefined){
      console.log('yes')
      const sessionID = uuidv4()
      session.sessionID=sessionID 
      console.log(sessionID)
    }else{
      console.log('NO')
    }*/
    let bannerImages=await adminHelpers.getBannerImages()
    console.log(bannerImages.length)
     
    for(let i=0;i<bannerImages.length;i++) {
       bannerImages[i].index=i
    } 
     
     
    let categories=await adminHelpers.getAllCategories()
   
    let cartCount=null
    if(user){
      console.log('yes')
    cartCount =await  userHelpers.getCartCount(user._id) 
    }else{
      cartCount=await userHelpers.getGuestCartCount(session.sessionID)
    }
    session.cartCount=cartCount
    
    res.render('user/home',{products,user,cartCount,home:true,categories,bannerImages});
    
  })
  
});
router.get('/all-products',(req,res)=>{ 
  let user=session.user
  productHelpers.getAllProductsInCategories().then((productsInCategories)=>{
    res.render('user/all-products',{productsInCategories,user})
  })
})
 
router.get('/signup',function(req,res,next){
let  errorMsg=session.signUpErr
 res.render('user/signup',{errorMsg})
 session.signUpErr=null
 
})
router.post('/signup',function(req,res,next){
   userHelpers.doSignup(req.body).then((response)=>{ 
    if(response.errMsg){
      session.signUpErr=response.errMsg
      res.redirect('/signup')
    }else{
      session.user=req.body
    session.userLoggedIn=true 
    guestUser=session.sessionID
    userHelpers.changeCartCollection(guestUser,session.user._id)
      res.redirect('/')
    }
     
   })
  
}) 
router.get('/login', function(req,res,next){
   let errorMsg=session.logInErr
  console.log(errorMsg)
  console.log(session.userLoggedIn);
 if(session.userLoggedIn==true){
  res.redirect('/')
 }else 
    res.render('user/login',{errorMsg,loginPage:true})
    console.log('heyy');
    session.logInErr=null  
 })

 router.post('/login',(req,res,next)=>{
  userHelpers.doLogin(req.body).then((result)=>{
    
    if (result.status==true){ 
    session.user=result.user 
    session.userLoggedIn=true  
 
    guestUser=session.sessionID
    userHelpers.changeCartCollection(guestUser,session.user._id)
      console.log(session.userLoggedIn,session.user);
      res.redirect('/') 
       
    }
    else{
      session.logInErr=result.err
      res.redirect('/login') 
    } 
  }) 
 })

 router.get('/logout',(req,res)=>{
      session.user=null
      session.userLoggedIn=null
      session.sessionID=null
      res.redirect('/')
 })
  
 router.get('/cart', async  (req,res)=>{
   user=session.user
  console.log('this is get Cart:'+user)
  if(user){
   var products=await userHelpers.getCartProducts(user._id)   
      var total=await  userHelpers.getTotalAmount(user._id)  
     console.log('inside if'+products+total+"user._id:"+user._id+'session.user_id:'+session.user._id)
     console.log(products[0])
  }else{
    console.log('this is inside else')
    products=await userHelpers.getGuestCartProducts(session.sessionID)
    total=await userHelpers.getGuestCartTotalAmount(session.sessionID) 
    console.log(products[0])
  }
   
  res.render('user/cart',{products,user,total})
  
 })
  
 router.get('/add-to-cart/:id',(req,res,next)=>{
  console.log('hey')
  console.log(req.params.id)
  var user=session.user
 console.log(user)
 ///4187ff9c-8524-42b0-97d0-7a796f1464f7
 guestUser=session.sessionID
 if(user){
  console.log(user._id)
    userHelpers.addToCart(req.params.id,user._id).then((response)=>{
    res.json(response) 
 })}else{
  userHelpers.addToGuestCart(req.params.id,guestUser).then((response)=>{
    res.json(response)
    console.log('yeah'+response) 
  })
}

 })
router.post('/change-product-quantity',async(req,res,next)=>{ 
user=session.user
 let response=await productHelpers.changeProductQuantity(req.body,user)
 console.log(req.body)
 if(user){
  response.total=await userHelpers.getTotalAmount(user._id)
 }else{
  response.total=await userHelpers.getGuestCartTotalAmount(session.sessionID)
 }
 
 
  
 res.json(response)  
})

router.get('/place-order',verifyLogin,async(req,res)=>{ 
  user=session.user 
    userHelpers.getTotalAmount(user._id).then((total)=>{ 
      res.render('user/place-order',{total,user})
  })

    
}) 

router.get('/remove-from-cart',(req,res)=>{ 
  var user=session.user
  console.log('user:'+user,'guestUser:'+session.sessionID)
  if(user){
   var data={
    prodId:req.query.prodId,
    userId:ObjectId(user._id) 
   }  
  var user=true
  }else{
     data={
      prodId:req.query.prodId,
      userId:session.sessionID 
     }  
  }
  console.log(data,user)
  userHelpers.removeFromCart(data,user).then((response)=>{   
   res.redirect('/cart')
  })
})
 
 
router.post('/place-order',async(req,res)=>{
  let prodId=req.body['ProdId']
   console.log(req.body)
  if(prodId){  
    let total=req.body['total']
    let quantity=req.body['quantity']
    let products=[{
      item:ObjectId(req.body['ProdId']),
      quantity:quantity
  }]
    ///await productHelpers.getProductAmount(req.body['ProdId'])
    
    
    
    userHelpers.placeOrder(req.body,products,total).then((orderId)=>{
      if(req.body['payment-method']==='COD'){
        res.json({codSuccess:true}) 
      }else{ 
        userHelpers.generateRazorepay(orderId,total).then((response)=>{  
          res.json(response) 
        })
      }  
    })
  }else{
     
    let total=await userHelpers.getTotalAmount(req.body['user'])  
    let Products=await userHelpers.getcartProductList(req.body['user']) 
    userHelpers.placeOrder(req.body,Products,total).then((orderId)=>{
      //console.log(Products)
      if(req.body['payment-method']==='COD'){
        res.json({codSuccess:true}) 
      }else{ 
        userHelpers.generateRazorepay(orderId,total).then((response)=>{  
          res.json(response) 
        })
      }  
    
   
 
    })
  }
    
})
 
router.post('/verify-payment',(req,res)=>{
  console.log(req.body)
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changePaymentStatus(req.body['order[reciept]']).then(()=>{
        
      res.json({paymentStatus:true}) 

    }).catch((err)=>{ 
      res.json({paymentStatus:false})
    })
  })
})
router.get('/order-success',(req,res)=>{
  let user=session.user
  res.render('user/order-success',{user}) 
})
router.get('/orders/:id',verifyLogin,(req,res)=>{
  userHelpers.getOrderDetails(req.params.id).then((details)=>{
    let user=session.user
    
   
    res.render('user/orders',{details,user})
  })
  
  
})
router.get('/view-ordered-products/:id',(req,res)=>{
   userHelpers.getOrderProducts(req.params.id).then((items)=>{
    let user=session.user
    console.log(items,user);
     res.render('user/view-order-products',{items,user})
   })
}) 

router.get('/buy-now/:id',(req,res)=>{
  let productId=req.params.id
  let user=session.user 
  console.log("hi"+productId);
   
  productHelpers.getThisProduct(productId).then((product)=>{ 
    let totalImages=product.totalImages 
    var index= []
    if(totalImages){
      for(let i=1;i<totalImages;i++) {
        index[i]={index:i}
     } 
    }
  
    console.log(product)
   res.render('user/this-product',{product,user,cartCount:session.cartCount,index})
  })    
})
router.post('/buy-now/:id',verifyLogin,(req,res)=>{
   
  let prodId=req.params.id
  user=session.user 
  productHelpers.getProductAmount(prodId).then(((amnt)=>{ 
    let quantity=req.body.quantity
    let total=amnt*quantity
    res.render('user/place-order',{total,user,prodId,quantity})
  })) 
})
 router.get('/profile',(req,res)=>{
  user=session.user
  res.render('user/profile',{user})
 }) 
 router.get('/category/:category',(req,res)=>{
  productHelpers.getCategoryProducts(req.params.category).then((products)=>{
    
    res.render('user/category',{category:req.params.category,products})
  }) 
 
 })
 router.get('/cancel-order/:id',(req,res)=>{
  userHelpers.cancelOrder(req.params.id).then((response)=>{
     res.json(response)
  })
 })

 router.post('/add-feedback',(req,res)=>{
   
   productHelpers.addFeedBack(req.body).then((response)=>{
    res.json({response:true})
    
   
   })
 })
 router.get('/clear-orders/:id',(req,res)=>{
 console.log(req.params.id)
  userHelpers.clearDeliveredOrCancelledOrders(req.params.id) 
   let userId=session.user._id
   res.redirect('/orders/'+userId)
 })

 router.post('/search',(req,res)=>{
  productHelpers.searchProducts(req.body.searchTerm).then((searchedItems)=>{
    res.render('user/search',{searchedItems})
  })
  
 })
 router.get('/product-details/:id',(req,res)=>{
  productHelpers.getProductDetails(req.params.id).then((details)=>{
    let totalImages=details.totalImages
    console.log(totalImages)
    var imgIndex= []
    for(let i=0;i<totalImages;i++) {
       imgIndex[i]={index:i+1}
    } 

    res.render('user/product-details',{details,imgIndex})
  })
 })

module.exports = router; 
