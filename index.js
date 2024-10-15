const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_KEY);

// auto
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const app = express();
const port = process.env.PORT || 5000;

// // middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://medicine-world-b0afb.web.app',
        'https://medicine-world-b0afb.firebaseapp.com'
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

        // await client.connect();
        const userCollection = client.db('medicineDB').collection('users');
        const medicineCollection = client.db('medicineDB').collection('allMedicines');
        const addCardCollection = client.db('medicineDB').collection('cardItem');
        const paymentsCollection = client.db('medicineDB').collection('allPayments');
        const categoryCollection = client.db('medicineDB').collection('allcategory');
        const sellerBannerCollection = client.db('medicineDB').collection('sellerBanner');
        const activeBannerCollection = client.db('medicineDB').collection('ActiveBanner');
        const invoiceCollection = client.db('medicineDB').collection('invoice');
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

        // verify seller
        const verifySeller = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isSeller = user?.role === 'seller';
            if (!isSeller) {
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

        app.post('/userAddress', async (req, res) => {
            const user = req.body;
            // duplicate email not granted;
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {

                const updateDoc = {
                    $set: {
                        image: user.image,
                        name: user.name,
                    },
                };
                const result = await userCollection.updateOne(query, updateDoc);
                res.send(result)
            }
        })


        //update user profile
    

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
                res.status(500).send("Internal Server Error");
            }
        });
        // search category /allSearch/
        app.get('/search/:category/:key', async (req, res) => {
            console.log(req.params.key)
            if (req.params.key) {
                let result = await medicineCollection.find({
                    category: req.params.category,
                    "$or": [
                        { medicinesName: { $regex: req.params.key, $options: 'i' } },
                        { genericName: { $regex: req.params.key, $options: 'i' } },
                        { company: { $regex: req.params.key, $options: 'i' } }
                    ]
                }).toArray();
                res.send(result);

            }


        })

        // search  allSearch
        app.get('/allSearch/:key', async (req, res) => {
            console.log(req.params.key)
            if (req.params.key) {
                let result = await medicineCollection.find({
                    "$or": [
                        { medicinesName: { $regex: req.params.key, $options: 'i' } },
                        { genericName: { $regex: req.params.key, $options: 'i' } },
                        { company: { $regex: req.params.key, $options: 'i' } }
                    ]
                }).toArray();
                res.send(result);

            }


        })


        // discount medicines
        app.get('/disMedicines', async (req, res) => {
            try {

                const query = { discountPercentage: { $gt: 0 } };
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
         // load user
         app.get('/users', async (req, res) => {
            try {
                
                const query = { role: 'user' }
                const result = await userCollection.find(query).toArray();
                // console.log("Result:", result); // Debugging
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        });

        // delete appointment
        app.delete('/cardItem/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) }
                const result = await addCardCollection.deleteOne(query);
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        })
        // delete all
        app.delete('/allCardItem', async (req, res) => {
            try {
                const ids = req.body.idsToDelete.map(id => new ObjectId(id)); // Parsing the IDs from request body
                const result = await addCardCollection.deleteMany({ _id: { $in: ids } });
                res.send(result);
                // console.log('inside',req.body.idsToDelete)

            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        });
        // update
        app.patch('/cardItemQuantity/:id', async (req, res) => {
            const id = req.params.id;
            const cardItem = req.body;
            const disC = (cardItem.perUnitPrice * cardItem.discountPercentage) / 100;
            const price = parseFloat(cardItem.quantity * (cardItem.perUnitPrice - disC));
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    grandTotal: parseFloat(price.toFixed(2)),
                    quantity: cardItem.quantity
                }

            }
            const updateCount = await addCardCollection.updateOne(query, updatedDoc);
            res.send(updateCount);

        })


        // payment
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;

            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",

                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post('/payments', async (req, res) => {
            const payment = req.body;

            const paymentResult = await paymentsCollection.insertOne(payment);

            // 
            const query = {
                _id: {
                    $in: payment.cardItemIds.map(id => new ObjectId(id))
                }
            }

            const deleteResult = await addCardCollection.deleteMany(query);
            // console.log('payment info', payment);
            res.send({ paymentResult, deleteResult });
            console.log('payment info', paymentResult, deleteResult);

        })
        // invoice
        // store appointment
        app.post('/payments/invoice/:email', async (req, res) => {
            try {
                const medicine = req.body;
                const email = req.params.email;

                if (!Array.isArray(medicine)) {
                    return res.status(400).send('Expected an array of payment objects');
                }
                const deleteResult = await invoiceCollection.deleteMany({ userEmail: email });
                // Insert the payment objects
                const insertResult = await invoiceCollection.insertMany(medicine);

                // Delete documents from invoiceCollection based on email


                res.status(201).send({
                    insertedCount: insertResult.insertedCount,
                    deletedCount: deleteResult.deletedCount
                });
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });



        app.get('/payments/invoice/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const query = { userEmail: email }
                const result = await invoiceCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }

        })


        // seller
        app.get('/sellerMedicines/:email', verifyToken, verifySeller, async (req, res) => {
            try {
                const email = req.params.email;
                const query = { email: email }
                const result = await medicineCollection.find(query).toArray();
                // console.log("Result:", result); // Debugging
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error hasan");
            }
        });

        // All category for Seller
        app.get('/allCategory', async (req, res) => {
            try {
                const result = await categoryCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        });
        // medicines post by seller 

        app.post('/allMedicines', async (req, res) => {
            const medicine = req.body;
            // duplicate email not granted;
            // const query = { email: user.email };
            // const existingUser = await userCollection.findOne(query);
            // if (existingUser) {
            //     return res.send({ message: 'user already exist', insertedId: null })
            // }
            const result = await medicineCollection.insertOne(medicine);
            res.send(result)
        })
        // category number set 
        app.patch('/category/number/:category', async (req, res) => {
            const category = req.params.category;
            // const result = await medicineCollection.find(category).toArray();
            const query = { category: category };
            const updatedDoc = {
                $inc: {
                    numMedicines: 1
                }

            }
            const updateCount = await categoryCollection.updateOne(query, updatedDoc);
            res.send(updateCount);
        })
        app.patch('/category/number/update/:category', async (req, res) => {
            const category = req.params.category;
            // const result = await medicineCollection.find(category).toArray();
            const query = { category: category };
            const updatedDoc = {
                $inc: {
                    numMedicines: -1
                }

            }
            const updateCount = await categoryCollection.updateOne(query, updatedDoc);
            res.send(updateCount);
        })


        // banner post
        app.post('/allBanner', async (req, res) => {
            const banner = req.body;
            const result = await sellerBannerCollection.insertOne(banner);
            res.send(result)
        })
        // 
        app.get('/sellerBanner/:email', verifyToken, verifySeller, async (req, res) => {
            try {
                const email = req.params.email;
                const query = { email: email }
                const result = await sellerBannerCollection.find(query).toArray();
                // console.log("Result:", result); // Debugging
                console.log('all--', result)
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error hasan");
            }
        });

        // delete addMedicine seller
        app.delete('/sellerMedicine/:id', verifyToken, verifySeller, async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) }
                const result = await medicineCollection.deleteOne(query);
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        })
        // delete addBanner seller
        app.delete('/sellerBanner/:id', verifyToken, verifySeller, async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) }
                const result = await sellerBannerCollection.deleteOne(query);
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        })

        // delete addMedicine seller
        app.delete('/admin/category/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) }
                const result = await categoryCollection.deleteOne(query);
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        })





        // admin
        // admin load all User
        app.get('/allUser', async (req, res) => {
            try {
                const result = await userCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        });
        // admin load all Category
        app.get('/admin/category', async (req, res) => {
            try {
                const result = await categoryCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        });

        // make admin '
        app.patch('/user/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const user = req.body;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: user.role
                }

            }
            const updateCount = await userCollection.updateOne(query, updatedDoc);
            res.send(updateCount);

        })
        // Admin Category post
        app.post('/admin/allCategory', verifyToken, verifyAdmin, async (req, res) => {
            const category = req.body;
            const result = await categoryCollection.insertOne(category);
            res.send(result)
        })

        //admin update doctor 
        app.patch('/admin/update/category/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const categoryInfo = req.body;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    category: categoryInfo.category,
                    title: categoryInfo.title,
                    description: categoryInfo.description,
                    image: categoryInfo.image
                }

            }
            const updateCount = await categoryCollection.updateOne(query, updatedDoc);
            res.send(updateCount);

        })

        // admin load all banner
        app.get('/admin/banner', async (req, res) => {
            try {
                const result = await sellerBannerCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        });
        // admin update seller status Banner
        app.patch('/admin/update/banner/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const bannerInfo = req.body;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: bannerInfo.status,
                    adminEmail: bannerInfo.adminEmail
                }

            }
            const updateCount = await sellerBannerCollection.updateOne(query, updatedDoc);
            res.send(updateCount);

        })

        //admin Active banner post
        app.post('/admin/active/banner', async (req, res) => {
            const banner = req.body;
            const result = await activeBannerCollection.insertOne(banner);
            res.send(result)
        })
        // home active banner load for all user /active/banner
        app.get('/active/banner', async (req, res) => {
            try {

                //  const query = {
                // _id: {
                //     $in: payment.cardItemIds.map(id => new ObjectId(id))
                // }

                const query = { status: 'active' }
                const result = await sellerBannerCollection.find(query).toArray();

                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        });
        //admin Payment get
        app.get('/admin/payment',verifyToken,verifyAdmin, async (req, res) => {
            try {
                const result = await paymentsCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }

        })
        // admin payment history
        app.patch('/admin/payment/:id',verifyToken, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const query = { _id: new ObjectId(id) };

            const updatedDoc = {
                $set: {
                    status: payment.status
                }

            }
            console.log(payment.status, id, query, updatedDoc)
            const updateCount = await paymentsCollection.updateOne(query, updatedDoc);
            res.send(updateCount);

        })
        // payment
        app.get('/admin/allPayment',verifyToken, async (req, res) => {
            try {
                const result = await paymentsCollection.find({status:'paid'}).toArray();
                const result1 = await paymentsCollection.find({status:'pending'}).toArray();
                res.send([result,result1]);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        });



        // user user
        // user payments
        app.get('/user/payment/:email', verifyToken, async (req, res) => {
            try {
                const email = req.params.email;
                const query = { email: email }
                const result = await paymentsCollection.find(query).toArray();
                // console.log("Result:", result); // Debugging
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        });





        // mixed 
        app.get('/seller/stat/:email',verifyToken,verifySeller, async (req, res) => {
            const emailId = req.params.email;
            console.log(emailId);

            const result = await paymentsCollection.aggregate([
                // Combine medicinesIds and quantityIds into a single array of objects
                {
                    $project: {
                        medicinesWithQuantities: {
                            $map: {
                                input: { $range: [0, { $size: "$medicinesIds" }] },
                                as: "idx",
                                in: {
                                    medicineId: { $arrayElemAt: ["$medicinesIds", "$$idx"] },
                                    quantity: { $arrayElemAt: ["$quantityIds", "$$idx"] }
                                }
                            }
                        },
                        email: 1,
                        status: 1
                    }
                },
                // Unwind the combined array
                { $unwind: "$medicinesWithQuantities" },
                // Ensure consistent order
                { $sort: { "medicinesWithQuantities.medicineId": 1 } },
                {
                    $addFields: {
                        medicinesObjectId: { $toObjectId: "$medicinesWithQuantities.medicineId" },
                        quantity: "$medicinesWithQuantities.quantity"
                    }
                },
                {
                    $lookup: {
                        from: 'allMedicines',
                        let: { medicinesObjectId: '$medicinesObjectId', paymentEmail: '$email' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$_id', '$$medicinesObjectId'] },
                                            { $eq: ['$email', emailId] }
                                        ]
                                    }
                                }
                            },
                            {
                                $project: {
                                    medicinesName: 1,
                                    perUnitPrice: 1,
                                    discountPercentage: 1
                                }
                            }
                        ],
                        as: 'menuItems'
                    }
                },
                { $unwind: '$menuItems' },
                {
                    $group: {
                        _id: {
                            medicinesName: '$menuItems.medicinesName',
                            status: '$status'
                        },
                        quantity: { $sum: '$quantity' },
                        totalPrice: { $sum: { $multiply: ['$menuItems.perUnitPrice', '$quantity'] } },
                        revenue: { $sum: { $multiply: ['$menuItems.perUnitPrice', { $subtract: [1, { $divide: ['$menuItems.discountPercentage', 100] }] }, '$quantity'] } }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        medicinesName: '$_id.medicinesName',
                        status: '$_id.status',
                        quantity: '$quantity',
                        totalPrice: '$totalPrice',
                        revenue: '$revenue'
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        items: { $push: '$$ROOT' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        status: '$_id',
                        items: '$items'
                    }
                }
            ]).toArray();

            res.send(result);
        });

        // sale for mixed
        app.get('/sales/stat/',verifyToken,verifyAdmin, async (req, res) => {
            const result = await paymentsCollection.aggregate([
                // Combine medicinesIds and quantityIds into a single array of objects
                {
                    $project: {
                        medicinesWithQuantities: {
                            $map: {
                                input: { $range: [0, { $size: "$medicinesIds" }] },
                                as: "idx",
                                in: {
                                    medicineId: { $arrayElemAt: ["$medicinesIds", "$$idx"] },
                                    quantity: { $arrayElemAt: ["$quantityIds", "$$idx"] }
                                }
                            }
                        },
                        email: 1,
                        date: 1,
                        status: 1
                    }
                },
                // Unwind the combined array
                { $unwind: "$medicinesWithQuantities" },
                // Ensure consistent order
                { $sort: { "medicinesWithQuantities.medicineId": 1 } },
                {
                    $addFields: {
                        medicinesObjectId: { $toObjectId: "$medicinesWithQuantities.medicineId" },
                        quantity: "$medicinesWithQuantities.quantity"
                    }
                },
                {
                    $lookup: {
                        from: 'allMedicines',
                        let: { medicinesObjectId: '$medicinesObjectId', paymentEmail: '$email' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$_id', '$$medicinesObjectId'] }
                                        ]
                                    }
                                }
                            },
                            {
                                $project: {
                                    medicinesName: 1,
                                    email: 1,
                                    date: 1,
                                    perUnitPrice: 1,
                                    discountPercentage: 1,
                                    company: 1  // Include the company field
                                }
                            }
                        ],
                        as: 'menuItems'
                    }
                },
                { $unwind: '$menuItems' },
                {
                    $group: {
                        _id: {
                            medicinesName: '$menuItems.medicinesName',

                            sellerEmail: '$menuItems.email', // Include company in the group key
                            status: '$status',
                            email: '$email',
                            date: '$date'
                        },
                        quantity: { $sum: '$quantity' },
                        totalPrice: { $sum: { $multiply: ['$menuItems.perUnitPrice', '$quantity'] } },
                        revenue: { $sum: { $multiply: ['$menuItems.perUnitPrice', { $subtract: [1, { $divide: ['$menuItems.discountPercentage', 100] }] }, '$quantity'] } }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        medicinesName: '$_id.medicinesName',
                        sellerEmail: '$_id.sellerEmail',  // Project the company field
                        status: '$_id.status',
                        email: '$_id.email',
                        date: '$_id.date',
                        quantity: '$quantity',
                        totalPrice: '$totalPrice',
                        revenue: '$revenue'
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        items: { $push: '$$ROOT' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        status: '$_id',
                        items: '$items'
                    }
                }
            ]).toArray();

            res.send(result);
        });









        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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