const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
// const stripe = require('stripe')(process.env.STRIPE_KEY);

// auto
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const app = express();
const port = process.env.PORT || 5000;

// // middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
    ],
    credentials: true
}));
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vdildbx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

        await client.connect();
        const userCollection = client.db('medicineDB').collection('users');
        const medicineCollection = client.db('medicineDB').collection('allMedicines');
        const addCardCollection = client.db('medicineDB').collection('cardItem');
        // const paymentsCollection = client.db('medicineDB').collection('payments');

        // admin related 
        const verifyToken = (req, res, next) => {
            console.log('inside toktok ', req.headers.authorization)
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = req.headers.authorization.split(' ')[1];

            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }
        // verify admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });

            }
            next();
        }
        // admin related


        // user related api
        // app.get('/user', verifyToken, verifyAdmin, async (req, res) => {
        //     try {
        //         // console.log("Result:", req.headers); // Debugging
        //         const result = await userCollection.find().toArray();

        //         res.send(result);
        //     } catch (error) {
        //         console.error(error);
        //         res.status(500).send("Internal Server Error");
        //     }
        // });



        app.post('/user', async (req, res) => {
            const user = req.body;
            // duplicate email not granted;
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exist', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result)
        })

        // make admin
        // app.patch('/user/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: new ObjectId(id) };
        //     const updatedDoc = {
        //         $set: {
        //             role: 'admin'
        //         }

        //     }
        //     const updateCount = await userCollection.updateOne(query, updatedDoc);
        //     res.send(updateCount);

        // })

        // user delete 
        // app.delete('/user/:id', verifyToken, verifyAdmin, async (req, res) => {
        //     try {
        //         const id = req.params.id;
        //         const query = { _id: new ObjectId(id) }
        //         const result = await userCollection.deleteOne(query);
        //         res.send(result);
        //     } catch (error) {
        //         console.error(error);
        //         res.status(500).send("Internal Server Error");
        //     }
        // })

        // admin check
        app.get('/user/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'unauthorized access' })
            }
            const query = { email: email }
            const result = await userCollection.findOne(query);
            let admin = false;
            if (result) {
                admin = result?.role === 'admin';
            }
            res.send({ admin });
        })
        // seller check
        app.get('/user/seller/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'unauthorized access' })
            }
            const query = { email: email }
            const result = await userCollection.findOne(query);
            let seller = false;
            if (result) {
                seller = result?.role === 'seller';
            }
            res.send({ seller });
        })






        // auth related api start,, logger
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })


        // All medicines
        app.get('/allMedicines', async (req, res) => {
            try {
                const result = await medicineCollection.find().toArray();
                // console.log("Result:", result); // Debugging
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        });
        // category medicines load
        app.get('/categoryMedicines/:category', async (req, res) => {
            try {
                const category = req.params.category;
                const query = { category: category }
                const result = await medicineCollection.find(query).toArray();
                // console.log("Result:", result); // Debugging
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error hasan");
            }
        });


        // one doctor loaded
        // app.get('/allDoctor/:id', async (req, res) => {
        //     try {
        //         const result = await doctorCollection.findOne({ _id: new ObjectId(req.params.id) });
        //         // console.log("Result:", result); // Debugging
        //         res.send(result);
        //     } catch (error) {
        //         console.error(error);
        //         res.status(500).send("Internal Server Error");
        //     }
        // });
        // doctor add
        // app.post('/allDoctor', verifyToken, verifyAdmin, async (req, res) => {
        //     try {
        //         const doctorInfo = req.body;
        //         const result = await doctorCollection.insertOne(doctorInfo);
        //         res.send(result);
        //     } catch (error) {
        //         console.error(error);
        //         res.status(500).send("Internal Server Error");
        //     }

        // })
        // update doctor
        // app.patch('/allDoctor/:id', verifyToken, verifyAdmin, async (req, res) => {
        //     const id = req.params.id;
        //     const doctorInfo = req.body;
        //     const query = { _id: new ObjectId(id) };
        //     const updatedDoc = {
        //         $set: {
        //             name: doctorInfo.name,
        //             email: doctorInfo.email,
        //             price: doctorInfo.price,
        //             image: doctorInfo.image,
        //             Specialty: doctorInfo.Specialty,
        //             startTime: doctorInfo.startTime,
        //             endTime: doctorInfo.endTime
        //         }

        //     }
        //     const updateCount = await doctorCollection.updateOne(query, updatedDoc);
        //     res.send(updateCount);

        // })

        // doctor delete 
        // app.delete('/allDoctor/:id', verifyToken, verifyAdmin, async (req, res) => {
        //     try {
        //         const id = req.params.id;
        //         const query = { _id: new ObjectId(id) }
        //         const result = await doctorCollection.deleteOne(query);
        //         res.send(result);
        //     } catch (error) {
        //         console.error(error);
        //         res.status(500).send("Internal Server Error");
        //     }
        // })



        // store appointment
        app.post('/addCard', async (req, res) => {
            try {
                const medicine = req.body;
                const result = await addCardCollection.insertOne(medicine);
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }

        })

        // load appointment
        app.get('/cardItem', async (req, res) => {
            try {
                const email = req.query.email;
                const query = { userEmail: email }
                const result = await addCardCollection.find(query).toArray();
                // console.log("Result:", result); // Debugging
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        });

        // delete appointment
        // app.delete('/appointment/:id', async (req, res) => {
        //     try {
        //         const id = req.params.id;
        //         const query = { _id: new ObjectId(id) }
        //         const result = await appointmentCollection.deleteOne(query);
        //         res.send(result);
        //     } catch (error) {
        //         console.error(error);
        //         res.status(500).send("Internal Server Error");
        //     }
        // })


        // payment
        // app.post("/create-payment-intent", async (req, res) => {
        //     const { price } = req.body;

        //     const amount = parseInt(price * 100);
        //     const paymentIntent = await stripe.paymentIntents.create({
        //         amount: amount,
        //         currency: "usd",

        //         payment_method_types: ['card']
        //     });

        //     res.send({
        //         clientSecret: paymentIntent.client_secret,
        //     });
        // });

        // app.post('/payments', async (req, res) => {
        //     const payment = req.body;

        //     const paymentResult = await paymentsCollection.insertOne(payment);

        //     // 
        //     const query = {
        //         _id: {
        //             $in: payment.appointmentIds.map(id => new ObjectId(id))
        //         }
        //     }

        //     const deleteResult=await appointmentCollection.deleteMany(query);
        //     // console.log('payment info', payment);
        //     res.send({paymentResult,deleteResult});
        //     console.log('payment info', paymentResult,deleteResult);

        // })







        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Final-Project-medicine is running')
})

app.listen(port, () => {
    console.log(`Final-Project-medicine is running on port ${port}`)
})