const express = require('express');
const mongodb = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

const app = express();
const mongoClient = mongodb.MongoClient;
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
	res.send('Welcome to Daily Dairy');
});

app.listen(PORT, console.log(`:::server is up and running on port ${PORT}`));
