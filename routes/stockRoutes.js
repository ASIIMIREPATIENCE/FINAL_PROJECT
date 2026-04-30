const express = require("express");
const router = express.Router();
const Stock = require('../models/Stock');
// const passport = require('passport');




router.get('/addStock',(req,res) => {
    res.render('stock')
})
router.post('/postStock',async(req,res)=>{
    try{
  const{productname,category,quantity,costprice,sellingprice,supplier,reorderlevel}= req.body
  const newStock = new Stock({
    productname,
    category,
    quantity,
    costprice,
    sellingprice,
    supplier,
    reorderlevel
  }) 
  await newStock.save()
  console.log(req.body)
  res.redirect('/addStock')
}catch(error){
    console.error(error)
    res.redirect('/addStock')
}
  console.log(req.body)
})







module.exports = router;