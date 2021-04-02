const express = require('express');
const mongodb = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const mail = require('./mail');

const app = express();
const mongoClient = mongodb.MongoClient;
const PORT = process.env.PORT || 3000;
const DB_URL = `mongodb+srv://admin-vishnu:vishnu123@vishnu.1nuon.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const DATA_BASE = 'Dairy';
const USERS_COLLECTION = 'users';
const POSTS_COLLECTION = 'posts';
dotenv.config();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
	res.send('Welcome to Daily Dairy');
});

app.post('/register', async (req, res) => {
	try {
		console.log(req.body);
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		console.log(DATA_BASE);
		const found = await db.collection(USERS_COLLECTION).findOne({ email: req.body.email });
		console.log(found);
		if (found) {
			res.status(400).json({ message: 'User Already Exists' });
		} else {
			const salt = await bcrypt.genSalt(10);
			const hash = await bcrypt.hash(req.body.password, salt);
			console.log(hash);
			req.body.password = hash;
			await db.collection(USERS_COLLECTION).insertOne(req.body);
			client.close();
			const mailOptions = {
				from: process.env.EMAIL,
				to: req.body.email,
				subject: 'Registration Successful!!!',
				html: `
               <p>Hi { req.body.name}</p>
               <p>Thank you for Registering <strong>Daily Dairy</strong></p>
               <p>Login to explore more</p>
               <p>${process.env.FRONTEND_URL}/login</p>
               `,
			};
			mail.sendMail(mailOptions, (err, data) => {
				if (err) {
					console.log(err);
				} else {
					console.log('Email Sent');
				}
			});
			res.status(200).json({ message: 'User Created' });
		}
	} catch (error) {
		console.log(error);
		res.status(400).json({ message: 'something went wrong' });
	}
});

app.listen(PORT, console.log(`:::server is up and running on port ${PORT}:::`));
