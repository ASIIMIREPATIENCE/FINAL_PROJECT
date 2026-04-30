const mongoose= require('mongoose')

const connectDb= async ()=>{
 try{
const conn = await mongoose.connect(process.env.DATABASE);
 console.log('Mongoose connection open');
 }catch(error){
    console.log(`Connection error: ${error.message}`);
    process.exit(1)
}
};


module.exports = connectDb;
