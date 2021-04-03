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
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		const found = await db.collection(USERS_COLLECTION).findOne({ email: req.body.email });
		if (found) {
			res.status(400).json({ message: 'User Already Exists' });
		} else {
			const salt = await bcrypt.genSalt(10);
			const hash = await bcrypt.hash(req.body.password, salt);

			req.body.password = hash;
			await db.collection(USERS_COLLECTION).insertOne(req.body);
			client.close();
			const mailOptions = {
				from: process.env.EMAIL,
				to: req.body.email,
				subject: 'Registration Successful!!!',
				html: `
               <p>Hi ${req.body.name}</p>
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

app.post('/login', async (req, res) => {
	try {
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		let user = await db.collection(USERS_COLLECTION).findOne({ email: req.body.email });
		if (user) {
			let match = await bcrypt.compare(req.body.password, user.password);
			console.log(match);
			if (match) {
				const token = jwt.sign({ email: req.body.email }, process.env.JWT_SECRET, {
					expiresIn: '1h',
				});
				res.status(200).json({ message: 'User Allowed', token });
			} else {
				res.status(400).json({ message: 'Invalid email or password' });
			}
		} else {
			res.status(400).json({ message: "User does't exist" });
		}
	} catch (error) {
		console.log(error);
		res.status(400).json({ message: 'something went wrong' });
	}
});

app.post('/forgot', async (req, res) => {
	try {
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		let user = await db.collection(USERS_COLLECTION).findOne({ email: req.body.email });
		if (user) {
			const mailOptions = {
				from: process.env.EMAIL,
				to: req.body.email,
				subject: 'Request to Reset Password!!',
				html: `
               <p>THere is the link to reset your password</p>
               <p>${process.env.FRONTEND_URL}/reset</p>
               `,
			};
			mail.sendMail(mailOptions, (err, data) => {
				if (err) {
					console.log(err);
				} else {
					console.log('Email Sent');
				}
			});
			res
				.status(200)
				.json({ message: 'Reset mail sent to specified email, please check your email' });
		} else {
			res.status(400).json({ message: "Email Doestn't exist, Try Again with valid Email" });
		}
	} catch (error) {
		console.log(error);
		res.status(400).json({ message: 'something went wrong' });
	}
});

app.put('/reset', async (req, res) => {
	try {
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		const user = await db.collection(USERS_COLLECTION).findOne({ email: req.body.email });
		if (user) {
			const salt = await bcrypt.genSalt(10);
			const hash = await bcrypt.hash(req.body.password, salt);
			req.body.password = hash;
			await db
				.collection(USERS_COLLECTION)
				.updateOne({ email: req.body.email }, { $set: { password: req.body.password } });
			res.status(200).json({ message: 'Password reseted successfully' });
		} else {
			res.status(400).json({ message: "User Doesn't exists, Try again with valid email" });
		}
	} catch (error) {
		console.log(error);
		res.status(400).json({ message: 'something went wrong' });
	}
});

app.listen(PORT, console.log(`:::server is up and running on port ${PORT}:::`));
