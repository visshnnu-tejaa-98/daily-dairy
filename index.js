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

const Authenticate = async (req, res, next) => {
	try {
		const bearer = await req.headers['authorization'];
		// console.log(bearer);
		if (!bearer) {
			return res.json({ message: 'access failed' });
		} else {
			jwt.verify(bearer, process.env.JWT_SECRET, (err, decode) => {
				if (decode) {
					req.body.auth = decode;
					// console.log('Authentication middleware success');
					next();
				} else {
					res.json({ message: 'Authentication Failed' });
				}
			});
		}
	} catch (error) {
		console.log(error);
		res.json({ message: 'Something went wrong in authentication' });
	}
};

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

app.post('/contact', async (req, res) => {
	try {
		console.log(req.body);
		const mailOptions = {
			from: req.body.email,
			to: process.env.EMAIL,
			subject: 'User Contacted!!',
			html: `
               <p>Hi Sir,</p>
               <p>My name is ${req.body.name}</p>
					<p><strong>Here is the message!!</strong></p>
               <p>${req.body.message}</p>
               `,
		};
		mail.sendMail(mailOptions, (err, data) => {
			if (err) {
				console.log(err);
			} else {
				console.log('Email Sent');
			}
		});
		res.json({ message: 'Mail Sent' });
	} catch (error) {
		console.log(error);
		res.status(400).json({ message: 'something went wrong' });
	}
});

app.post('/addPost', [Authenticate], async (req, res) => {
	try {
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		const post = await db
			.collection(POSTS_COLLECTION)
			.findOne({ email: req.body.auth.email, date: req.body.date });
		console.log(post);
		if (!post) {
			await db
				.collection(POSTS_COLLECTION)
				.insertOne({ email: req.body.auth.email, date: req.body.date, post: req.body.data });
			res.status(200).json({ message: 'Submitted Successfully' });
		} else {
			console.log(post);
			res.status(400).json({ message: "You're Supposed to submit one time per day!" });
		}
	} catch (error) {
		console.log(error);
		res.status(400).json({ message: 'something went wrong' });
	}
});

app.get('/posts/:date', [Authenticate], async (req, res) => {
	try {
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		const post = await db
			.collection(POSTS_COLLECTION)
			.findOne({ email: req.body.auth.email, date: req.params.date });
		if (post) {
			res.status(200).json({ post });
		} else {
			res.status(400).json({ message: 'No data found, Try with Another Date' });
		}
	} catch (error) {
		console.log(error);
		res.status(400).json({ message: 'something went wrong' });
	}
});

app.post('/posts', [Authenticate], async (req, res) => {
	try {
		console.log(req.body);
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		let post = '';
		let year = `/${req.body.year}/`;

		if (req.body.month === 'Jan') {
			post = await db
				.collection(POSTS_COLLECTION)
				.find({ email: req.body.auth.email, date: { $in: [/^Jan/, year] } })
				.toArray();
		} else if (req.body.month === 'Feb') {
			post = await db
				.collection(POSTS_COLLECTION)
				.find({ email: req.body.auth.email, date: { $in: [/^Feb/, year] } })
				.toArray();
		} else if (req.body.month === 'Mar') {
			post = await db
				.collection(POSTS_COLLECTION)
				.find({ email: req.body.auth.email, date: { $in: [/^Mar/, year] } })
				.toArray();
		} else if (req.body.month === 'Apr') {
			post = await db
				.collection(POSTS_COLLECTION)
				.find({ email: req.body.auth.email, date: { $in: [/^Apr/, year] } })
				.toArray();
		} else if (req.body.month === 'May') {
			post = await db
				.collection(POSTS_COLLECTION)
				.find({ email: req.body.auth.email, date: { $in: [/^May/, year] } })
				.toArray();
		} else if (req.body.month === 'Jun') {
			post = await db
				.collection(POSTS_COLLECTION)
				.find({ email: req.body.auth.email, date: { $in: [/^Jun/, year] } })
				.toArray();
		} else if (req.body.month === 'Jul') {
			post = await db
				.collection(POSTS_COLLECTION)
				.find({ email: req.body.auth.email, date: { $in: [/^Jul/, year] } })
				.toArray();
		} else if (req.body.month === 'Aug') {
			post = await db
				.collection(POSTS_COLLECTION)
				.find({ email: req.body.auth.email, date: { $in: [/^Aug/, year] } })
				.toArray();
		} else if (req.body.month === 'Sep') {
			post = await db
				.collection(POSTS_COLLECTION)
				.find({ email: req.body.auth.email, date: { $in: [/^Sep/, year] } })
				.toArray();
		} else if (req.body.month === 'Oct') {
			post = await db
				.collection(POSTS_COLLECTION)
				.find({ email: req.body.auth.email, date: { $in: [/^Oct/, year] } })
				.toArray();
		} else if (req.body.month === 'Nov') {
			post = await db
				.collection(POSTS_COLLECTION)
				.find({ email: req.body.auth.email, date: { $in: [/^Nov/, year] } })
				.toArray();
		} else if (req.body.month === 'Dec') {
			post = await db
				.collection(POSTS_COLLECTION)
				.find({ email: req.body.auth.email, date: { $in: [/^Dec/, year] } })
				.toArray();
		}
		if (post) {
			res.status(200).json({ post });
		} else {
			res.status(400).json({ message: 'No data found, Try with Another Date' });
		}
	} catch (error) {
		console.log(error);
		res.status(400).json({ message: 'something went wrong' });
	}
});

app.listen(PORT, console.log(`:::server is up and running on port ${PORT}:::`));
