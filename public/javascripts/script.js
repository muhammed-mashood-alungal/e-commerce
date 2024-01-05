function addToCart(prodId){ 
  
    $.ajax({ 
      url:'/add-to-cart/'+prodId,
      method:'get', 
      success:(response)=>{ 
         
        if(response.proExist==false){ 
           
          let count =$('#cart-count').html()
          console.log(count)
          count=parseInt(count)+1
          $('#cart-count').html(count) 
          console.log(count)
          } 
      }
    }) 
  
   
    
  }
  