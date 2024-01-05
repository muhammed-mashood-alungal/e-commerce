const bcrypt=require('bcrypt')
module.exports={
   ADMIN_USERNAME:bcrypt.hash('spr-admin',10),
   ADMIN_PASSWORD:bcrypt.hash('p',10)
}

 


