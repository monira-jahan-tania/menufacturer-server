const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jvqmx.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        const toolCollection = client.db('anyasha_tech').collection('tools');
        const purchaseCollection = client.db('anyasha_tech').collection('purchases');
        const userCollection = client.db('anyasha_tech').collection('users');
        const reviewCollection = client.db('anyasha_tech').collection('reviews');
        const paymentCollection = client.db('anyasha_tech').collection('payments');

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }
        }

        app.get('/parts', async (req, res) => {
            const query = {};
            const cursor = toolCollection.find(query);
            const parts = await cursor.toArray();
            res.send(parts);
        });
        app.post('/parts', async (req, res) => {
            const parts = req.body;
            const result = await toolCollection.insertOne(parts);
            res.send(result);
        });
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const purchase = req.body;
            const price = purchase.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({ clientSecret: paymentIntent.client_secret })
        })

        app.get('/part/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const part = await toolCollection.findOne(query);
            res.send(part);
        });

        //user
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })
        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: { user },
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        });
        //purchased
        app.get('/purchase', verifyJWT, async (req, res) => {
            const user = req.query.user;
            const query = { user: user };
            const purchase = await purchaseCollection.find(query).toArray();
            return res.send(purchase);
        })
        app.get('/allPurchase', async (req, res) => {
            const allPurchased = await purchaseCollection.find().toArray();
            res.send(allPurchased)
        })
        app.post('/purchase', async (req, res) => {
            const purchase = req.body;
            const result = await purchaseCollection.insertOne(purchase);
            return res.send({ success: true, result });
        })
        app.get('/purchase/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const purchase = await purchaseCollection.findOne(query);
            res.send(purchase);
        })
        app.patch('/purchase/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }

            const result = await paymentCollection.insertOne(payment);
            const updatedPurchase = await purchaseCollection.updateOne(filter, updatedDoc);
            res.send(updatedPurchase);
        })

        //review
        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            return res.send({ success: true, result })
        })

        //profile
        // app.put('/users', async(req, res)=>{
        //     const user = req.body; 
        // })
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const updateDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })
    }
    finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('manufacture tools')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

