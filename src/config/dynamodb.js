// src/config/dynamodb.js

const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS SDK with your credentials
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Create DynamoDB document client
const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports = dynamoDb;
