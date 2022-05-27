const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jvqmx.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const toolCollection = client.db('anyasha_tech').collection('tools');
        const purchaseCollection = client.db('anyasha_tech').collection('purchases');
        const userCollection = client.db('anyasha_tech').collection('users');

        app.get('/parts', async (req, res) => {
            const query = {};
            const cursor = toolCollection.find(query);
            const parts = await cursor.toArray();
            res.send(parts);
        });
        app.get('/part/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const part = await toolCollection.findOne(query);
            res.send(part);
        });
        //purchased
        app.get('/purchase', async (req, res) => {
            const user = req.query.user;
            const query = { user: user };
            const purchase = await purchaseCollection.find(query).toArray();
            return res.send(purchase);
        })
        app.post('/purchase', async (req, res) => {
            const purchase = req.body;
            const result = await purchaseCollection.insertOne(purchase);
            return res.send({ success: true, result });
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

