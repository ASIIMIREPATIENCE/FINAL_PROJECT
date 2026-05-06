const express = require("express");
const router = express.Router();
const Registration = require('../models/Registration');
const passport = require('passport');
const Sale = require('../models/Sales'); 



// router.get("/", (req, res) => {
//     res.render('index')
// })


// // user registration
// router.get("/register", (req, res) => {
//     res.render('registration')
// })

// router.post('/postreg',async(req,res)=>{

// try{
//    const { fullname, email, phonenumber, password,confirmpassword,role} = req.body;
//     let existingemail=await Registration.findOne({email:email.toLowerCase()})

// if(existingemail){
//     return res.status(401).render('registration',{message:"Email already exists"})}

//    const newemail=new Registration({
//      fullname,
//     email:email.toLowerCase(),
//     phonenumber,
//     role,
//    })

//   await Registration.register(newemail, password);
//   res.redirect('/')
    
//    }catch(error){
//     console.log(error)
//     res.render('registration',{error:error.message})
//    }
// })

// user login
router.get("/userlogin", (req, res) => {
    res.render('login')
})
router.post('/postlogin',passport.authenticate('local',{failure:'/userlogin'}),(req,res)=>{
    if(req.user.role === 'admin'){
        res.redirect('/admin')
    }else if(req.user.role === 'store_manager'){
        res.redirect('/manager')
    }else if(req.user.role === 'sales_attendant'){
        res.redirect('/salesattendant')
    }else{

        res.redirect('/')
    }
    
})
  
// router.get("/admin", (req, res) => {
//     res.render('admin_dashboard')
// })
// router.get("/manager", (req, res) => {
//     res.render('manager_dashboard')
// })

// router.get("/salesattendant", async (req, res) => {
//     try {
//         const sales = await Sale.find()
//             .populate('attendant', 'fullname')  // Only populate attendant (it's an ObjectId)
//             .sort({ Date: -1 })  // Note: 'Date' not 'date' (check your schema)
        
//         res.render('sales_dashboard', { sales })
//     } catch (error) {
//         console.log(error.message)
//         res.status(500).send('Cannot collect data from the database')
//     }
// })
// // router.get("/salesattendant", async (req, res) => {
// //     try {
// //         const sales= await Sale.find()
// //         .populate('productname')
// //         .populate('attendant', 'fullname')
// //         .sort({date:-1})
// //          res.render('sales_dashboard', {sales})
// //     } catch (error) {
// //       console.log(error.message)
// //       res.status(500).send('cannot collect data from the database')  
// //     }
   
   
// // })

// router.get('/logout', (req, res, next) => {
//     req.logout((err)=>{
//         if(err){
//             return next(err)
//         }
//         res.redirect('/')
//     })
// })


// router.get('/users', async (req, res) => {
//     try {
//         const users = await Registration.find();
//         res.render('user_mgt', { users: users });
//     } catch (error) {
//         console.log(error);
//         res.render('user_mgt', { users: [] });
//     }
// });












module.exports = router;