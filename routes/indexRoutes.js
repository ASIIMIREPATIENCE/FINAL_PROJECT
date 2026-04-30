const express = require("express");
const router = express.Router();
const Registration = require('../models/Registration');
const passport = require('passport');


router.get("/", (req, res) => {
    res.render('index')
})


// user registration
router.get("/register", (req, res) => {
    res.render('registration')
})

router.post('/postreg',async(req,res)=>{

try{
   const { fullname, email, phonenumber, password,confirmpassword,role} = req.body;
    let existingemail=await Registration.findOne({email:email.toLowerCase()})

if(existingemail){
    return res.status(401).render('registration',{message:"Email already exists"})}

   const newemail=new Registration({
     fullname,
    email:email.toLowerCase(),
    phonenumber,
    role,
   })

  await Registration.register(newemail, password);
  res.redirect('/')
    
   }catch(error){
    console.log(error)
    res.render('registration',{error:error.message})
   }
})

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
  
router.get("/admin", (req, res) => {
    res.render('admin_dashboard')
})
router.get("/manager", (req, res) => {
    res.render('manager_dashboard')
})

router.get("/salesattendant", (req, res) => {
    res.render('sales_dashboard')
})

router.get('/logout', (req, res, next) => {
    req.logout((err)=>{
        if(err){
            return next(err)
        }
        res.redirect('/')
    })
})





module.exports = router;