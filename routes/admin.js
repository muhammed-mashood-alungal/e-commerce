var express = require('express');
const session = require('express-session');
const async = require('hbs/lib/async');
const { prototype } = require('express-fileupload/lib/uploadtimer');
const { response, application } = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helpers')
var adminHelpers = require('../helpers/admin-helpers');
var userHelpers=require('../helpers/user-helpers');
const productHelpers = require('../helpers/product-helpers');
const { FindCursor, ObjectId } = require('mongodb')
const { rulesToMonitor } = require('nodemon/lib/monitor/match');
const fs=require('fs')
const fsextra=require('fs-extra')
const verifyAdminLogin = (req, res, next) => {
  if (session.adminLoggedIn == true) {
    next()
  } else {
    res.redirect('admin/admin-login')
  }
}
router.get('/', verifyAdminLogin, async(req, res) => {
 let customersCount=await adminHelpers.getCustomersCount()
 let pendingOrders=await adminHelpers.getpendingOrders()
 let todaysSale=await adminHelpers.getTodaysSalesAmount()
 let totalSales=await adminHelpers.getTotalRevenue()
 let notifications=await adminHelpers.getNotifications()
 
 const stats={customersCount,pendingOrders,todaysSale,totalSales}
 console.log(stats)
  res.render('admin/dashboard',{admin:true,stats,notifications})
})

router.get('/view-products',  function (req, res, next) {
  productHelper.getAllProducts().then((products) => {
    admin = session.adminLoggedIn 
    res.render('admin/view-products', { admin: true, products});
  })

});

router.get('/admin-login',async(req, res)=>{  
  if(session.adminLoggedIn==true){
    res.redirect('/admin') 
  }else{ 
    var errMsg = session.admLoginErr 
    res.render('admin/admin-login', { loginPage:true, admin:true,errMsg ,rmvButton:true})
    session.admLoginErr = null
  } 
})
router.post('/adm-login', (req, res) => {
  console.log(req.body)

  adminHelpers.doLogin(req.body).then(() => {
    session.adminLoggedIn=true
    console.log(session.adminLoggedIn)
    res.redirect('/admin')

  }).catch((err) => {
    session.admLoginErr = err
    console.log(session.admLoginErr);
    res.redirect('/admin/admin-login')
  })

})
router.get('/add-product', async function (req, res) {
  var Categories=await adminHelpers.getAllCategories()
  res.render('admin/add-product', { admin: true ,Categories})
})

router.post('/add-product', (req, res) => {
  var length=req.files.img.length 
  req.body.totalImages=length
  productHelper.addProduct(req.body).then((id) => { 
    let folderPath='./public/product-images/'+id 
   
   fs.mkdirSync(folderPath,{recursive:true}) 
  var  index=0
  var error 
  while(index<length){
     if(index<6){
 console.log(index)
 let image = req.files.img[index]
      image.mv( folderPath+ '/' + index+'.jpg', (err, data) => { 
           error=err  
      })
     
    }
    index=index+1 
    }
    if (error==undefined) {
      res.redirect('/admin/add-product')
    }    
  })
})
router.get('/delete-product/:id', (req, res) => {
  productHelper.deleteProduct(req.params.id).then((id) => {
    console.log('ok delete success')
    console.log(req.params.id)
    res.redirect('/admin/view-products')
    let folderPath='./public/product-images/'+req.params.id
    fsextra.remove(folderPath,(err)=>{
      console.log('hai')
    })



  })
})
router.get('/edit-product/:id', (req, res) => {
  productHelper.getProductDetails(req.params.id).then(async(details) => {
    var Categories=await adminHelpers.getAllCategories()
    console.log(details)
    let totalImages=details.totalImages
    console.log(totalImages)
    var imgIndex= []
    for(let i=0;i<totalImages;i++) {
       imgIndex[i]={index:i+1}
    } 
    res.render("admin/edit-product", { details ,Categories,admin:true,imgIndex})
  })
})

router.post('/edit-product/:id', (req, res) => {
  console.log(req.params.id)
  if(req.files){
  var length=req.files.img.length 
  req.body.totalImages=length 
} 
  productHelper.updateProduct(req.params.id, req.body).then((response) => {
    res.redirect('/admin/view-products')
    console.log('hello')
    
   if(req.files){
  var  index=0
  var error 
  while(index<length){
 console.log(index)
 let image = req.files.img[index]
      image.mv('./public/product-images/'+req.params.id+'/'+ index+'.jpg', (err, data) => { 
           error=err  
      })
      index=index+1 
    }}
     
    /*if (req.files) {
      let image = req.files.img 
      image.mv('./public/product-images/' + req.params.id + '.jpg')
    }*/
  })
})
router.get('/all-orders',async function (req,res){
  
 let details=await adminHelpers.getAllOrderDetailsforAdmin() 
 let cancelledorder=await adminHelpers.getAllCancelledOrders() 
 let deliveredOrders=await adminHelpers.getAllDeliveredOrders()
  res.render('admin/all-orders',{details,admin:true,cancelledorder,deliveredOrders})
  console.log('hadfsd')
  
})
 

router.get('/view-ordered-products-admin/:id',(req,res)=>{
  userHelpers.getOrderProducts(req.params.id).then((items)=>{
   let user=session.user
   console.log(items,user);
    res.render('user/view-order-products',{items,admin:true})
  })
})
router.post('/change-status',(req,res)=>{ 
  console.log(req.body)
  productHelper.changeDeliveryStatus(req.body.status,req.body.orderId).then((response)=>{
    response.status=req.body.status
    res.json(response)
  })
})
router.get('/customers',(req,res)=>{
  adminHelpers.getAllUsers().then((users)=>{
   res.render('admin/customers',{users,admin:true})
  })
 })
 router.get('/remove-user/:id',(req,res)=>{
  userHelpers.removeUser(req.params.id).then(()=>{
    res.redirect('/admin/customers')
  })
 })

 router.get('/tools',async(req,res)=>{ 
  let bannerImages=await adminHelpers.getBannerImages()
 adminHelpers.getAllCategories().then((Categories)=>{
  console.log(Categories)
  res.render('admin/tools',{Categories,bannerImages,admin:true})
 })
 
 })
 router.post('/add-category',(req,res)=>{
  console.log(req.body)
    adminHelpers.addCategory(req.body).then(()=>{
      res.redirect('/admin/tools')
    })
})
router.post('/add-banner',(req,res)=>{
   if(req.files){
  let folderpath='./public/banner-images'
    fs.mkdirSync(folderpath,{recursive:true})
    
    let image=req.files.bannerImg
    let imageName=image.name
    let imagePath=folderpath+'/'+imageName 
    image.mv(imagePath)
    adminHelpers.addBannerimage(imageName)
  }
    res.redirect('/admin/tools')

    
})
router.get('/delete-banner/:name',(req,res)=>{
   let imgName=req.params.name
  adminHelpers.deleteBannerImage(imgName).then(()=>{
    let imagePath='./public/banner-images/'+imgName
    console.log(imagePath)
    fs.unlink(imagePath,(err)=>{ 
       console.log('too done')
        res.redirect('/admin/tools')
      
    })
    
  })

})

router.get('/delete-category/:name',(req,res)=>{
  adminHelpers.deleteCategory(req.params.name).then(()=>{
    res.redirect('/admin/tools')
  })
})
router.get('/remove-notification/:id',(req,res)=>{
   adminHelpers.removeOnenotification(req.params.id).then(()=>{
    res.redirect('/admin')
   })
})
router.get('/clear-notifications',(req,res)=>{
  adminHelpers.clearNotifications().then(()=>{
    res.redirect('/admin')
  })
})

router.post('/cancel-this-order',(req,res)=>{
   
  adminHelpers.cancelthisOrder(req.body.orderId,req.body.reason).then((response)=>{
    res.json({response:true})
    console.log('Done')
  })
})
router.get('/todays-sales-details',(req,res)=>{
  adminHelpers.getTodaysSalesDetails().then((sales)=>{
    res.render('admin/todays-sales-details',{sales})
  })
})
router.get('/all-sales-details',(req,res)=>{
  adminHelpers.getAllSalesDetails().then((sales)=>{
    res.render('admin/all-sales',{sales})
  }
)})
router.get('/order-details/:id',(req,res)=>{
  adminHelpers.getOrderDetails(req.params.id).then((details)=>{
    res.render('admin/order-details',{details,user:details.userName})
  })
})
router.get('/product-details/:id',(req,res)=>{
  productHelper.getProductDetails((req.params.id)).then((details)=>{{
    let totalImages=details.totalImages
    console.log(totalImages)
    var imgIndex= []
    for(let i=0;i<totalImages;i++) {
       imgIndex[i]={index:i+1}
    } 
    res.render('admin/product-details',{details,imgIndex})
  }})
})

module.exports = router;
