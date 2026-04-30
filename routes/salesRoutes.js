const express = require("express");
const router = express.Router();
const Sale = require('../models/Sales');
// const passport = require('passport');


router.get("/sale", (req, res) => {
    res.render('new_sale')
})



router.post('/postSale',async(req,res) => {
try{
    const {customername,phonenumber,nin,paymentmethod,productname,quantity, unitprice,distance,rate} = req.body;    
    const total = (quantity * unitprice)+(distance*rate);
    const newSale= new Sale({
        customername,
        phonenumber,
        nin,
        paymentmethod,
        productname,
        quantity,
        unitprice,
        distance,
        rate,
        total
    })
    
    await newSale.save()
    res.redirect('/sale')
    
} catch (error) {
    console.log(error)
    res.render('new_sale',{error:error.message})
}
})
  
// router.get("/sale", (req, res) => {
//     res.render('new_sale')
// })

// router.post('/postSale',async(req,res) => {
// console.log('formdata recieved')
//     console.log(req.body)
// })







module.exports = router;