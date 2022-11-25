const express = require('express');
const cors = require('cors');
const {MongoClient, ObjectId} = require('mongodb')
const jwt = require('jsonwebtoken');

require('dotenv').config()
require('colors')
// server variables
const app = express();
const port = process.env.PORT || 3000 ;
// middleware functions
app.use(cors())
app.use(express.json());
function verifyToken(req, res, next) {

}
// DataBase Connection
const  url = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.0ang8.mongodb.net/test`
const client = new MongoClient(url)
async function connect(){
      try {
            await client.connect()
            console.log('DataBase connection established successfully'.cyan.bold)
      } 
      catch(err){ console.log( err.message.red.bold) }
}
connect()
// DataBase Collection 
const users = client.db('PrimeMotors').collection('users')
const products = client.db('PrimeMotors').collection('products')
const categories = client.db('PrimeMotors').collection('categories')
// Route for the server 
app.get('/', async(req,res)=>{
  res.send(' server is  running')
})
app.get('/products', async(req,res)=>{
  const result = await products.find({}).toArray()
  res.send(result)
})
app.get('/products/:ID', async(req,res)=>{
  //  const ID = JSON.stringify(req.params.ID)
   const ID = req.params.ID
    const filter = {category:ID}
    console.log(filter)
  const result = await products.find(filter).toArray()
  res.send(result)
})
app.post('/product', async(req,res)=>{
  const getProduct = req.body.product
  const result = await products.insertOne(getProduct)
  if(result.acknowledged) { return  res.send(result) }
 res.status(500).send("Sometihng went wrong")
})
app.delete('/product/:ID',async(req,res)=>{
  const productID = req.params.ID
  const result =  products.deleteOne({_id:ObjectId(productID)})
  res.send(result)
})
app.get('/categories',async(req,res)=>{
  // const rowData = await categories.find({}).toArray()
  // rowData.map(async (item )=>{
  //   const count = await cars.count({type:item.name})
  //   const update= await categories.updateOne({name:item.name},{$set:{totalItem:count}},{ upsert: true } )
   
    
  // })
const result  = await categories.find({}).toArray()
  res.send(result)
 
  
})
app.post('/get-token',async(req,res)=>{
    const user = req.body.user
  await  users.updateOne({email:user.email} ,{$set:user}, {upsert:true} )

const token =  jwt.sign(user,process.env.ACCESS_TOKEN_SECRET)
res.send({token})
})



// Server RunCommandOperation
app.listen( port,()=>{ console.log(` server listening on port ${port}`)})

