const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;

//middlewares
app.use(
    cors({
        origin: ['http://localhost:5173', 'https://poised-kitten.surge.sh'],
        credentials: true,
    }),
)
app.use(express.json());

console.log(process.env.DB_PASS)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wucyw0m.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();

    const shopCollection = client.db('inventory').collection('shop');
    const userCollection = client.db('inventory').collection('users');
    const productCollection = client.db('inventory').collection('products');

    app.post('/jwt', async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '1h'});
            res.send({ token });
    })

    //middlewares
    const verifyToken = (req, res, next) => {
        console.log('inside verify token', req.headers);
        if(!req.headers.authorization) {
            return res.status(401).send({ message: 'forbidden access'});
        }
        const token = req.headers.authorization.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if(err){
                return res.status(401).send({ message: 'forbidden access'})
            }
            req.decoded = decoded;
            next();
        })
    }

    app.get('/users', verifyToken,  async(req, res) => {
        console.log(req.headers);
        const result = await userCollection.find().toArray();
        res.send(result);
    })

    app.get('/users/admin/:email', verifyToken, async(req, res) => {
        const email = req.params.email;
        if(email !== req.decoded.email){
            return res.status(403).send({message: 'unauthorized access'})
        }
        const query = {email: email};
        const user = await userCollection.findOne(query);
        let admin = false;
        if(user){
            admin = user?.role === 'admin';
            admin = user?.role === 'admin';
        }
        res.send({admin});
    })
    app.get('/users/manager/:email', verifyToken, async(req, res) => {
        const email = req.params.email;
        if(email !== req.decoded.email){
            return res.status(403).send({message: 'unauthorized access'})
        }
        const query = {email: email};
        const user = await userCollection.findOne(query);
        let manager = false;
        if(user){
            manager = user?.role2 === 'manager';
        }
        res.send({manager});
    })

    app.post('/users', async(req, res) => {
        const user = req.body;
        const query = {email: user.email}
        const existingUser = await userCollection.findOne(query);
        if(existingUser){
            return res.send({ message: 'user already exists', insertedId: null })
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
    })

    app.patch('/users/admin/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id)};
        const updatedDoc = {
            $set: {
                role: 'admin'
            }
        }
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })
    app.patch('/users/manager/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id)};
        const updatedDoc = {
            $set: {
                role2: 'manager'
            }
        }
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })

    app.delete('/users/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await userCollection.deleteOne(query);
        res.send(result);
    })

    app.post('/shops', async(req, res) => {
        const shop = req.body;
        console.log(shop);
        const result = await shopCollection.insertOne(shop);
        res.send(result);
    });

    app.get('/shops', async (req, res) => {
        try {
            const result = await shopCollection.find().toArray();
            res.send(result);
        } catch (error) {
            console.error("Error retrieving products:", error);
            res.status(500).send("Internal Server Error");
        }
    });
    app.post('/products', async(req, res) => {
        const product = req.body;
        console.log(product);
        const result = await productCollection.insertOne(product);
        res.send(result);
    });
    
    app.get('/products', async (req, res) => {
        try {
            const result = await productCollection.find().toArray();
            res.send(result);
        } catch (error) {
            console.error("Error retrieving products:", error);
            res.status(500).send("Internal Server Error");
        }
    });

    app.get('/products/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await productCollection.findOne(query);
        res.send(result);
    })


    app.delete('/products/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await productCollection.deleteOne(query);
        res.send(result);
    })
    

    app.get('/current', async (req, res) => {
        let query = {};
    
        // Check if req.query.email exists
        if (req.query.email) {
            // Adjust the query based on your database field names
            query = { email: req.query.email };
        } else {
            // Handle the case where req.query.email doesn't exist
            res.status(400).json({ error: 'Email parameter is required' });
            return;
        }
    
        try {
            const result = await shopCollection.find(query).toArray();
            res.json(result);
        } catch (error) {
            console.error('Error retrieving data from MongoDB:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
    
    


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('inventory is here')
})

app.listen(port, () => {
    console.log(`inventory server is running on port ${port}` )
})