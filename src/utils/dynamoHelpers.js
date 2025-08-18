// src/utils/dynamoHelpers.js

const { v4: uuidv4 } = require('uuid');
const dynamoDb = require('../config/dynamodb');

/**
 * Creates a new item in a DynamoDB table
 * @param {string} tableName - The name of the table
 * @param {object} item - The item to create
 * @returns {Promise} - The created item
 */
const createItem = async (tableName, item) => {
    const params = {
        TableName: tableName,
        Item: {
            ...item,
            createdAt: new Date().toISOString()
        }
    };

    await dynamoDb.put(params).promise();
    return params.Item;
};

/**
 * Updates an item in a DynamoDB table
 * @param {string} tableName - The name of the table
 * @param {object} key - The primary key of the item
 * @param {object} updateExpression - The update expression
 * @param {object} expressionAttributeValues - The expression attribute values
 * @returns {Promise} - The updated item
 */
const updateItem = async (tableName, key, updateExpression, expressionAttributeValues) => {
    const params = {
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
    };

    const result = await dynamoDb.update(params).promise();
    return result.Attributes;
};

/**
 * Queries items from a DynamoDB table
 * @param {string} tableName - The name of the table
 * @param {string} indexName - The name of the index (optional)
 * @param {string} keyConditionExpression - The key condition expression
 * @param {object} expressionAttributeValues - The expression attribute values
 * @returns {Promise} - The query results
 */
const queryItems = async (tableName, indexName, keyConditionExpression, expressionAttributeValues) => {
    const params = {
        TableName: tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues
    };

    if (indexName) {
        params.IndexName = indexName;
    }

    const result = await dynamoDb.query(params).promise();
    return result.Items;
};

/**
 * Generates a unique ID
 * @returns {string} - A unique ID
 */
const generateUniqueId = () => {
    return uuidv4();
};

/**
 * Deletes an item from a DynamoDB table
 * @param {string} tableName - The name of the table
 * @param {object} key - The primary key of the item
 * @returns {Promise} - The delete result
 */
const deleteItem = async (tableName, key) => {
    const params = {
        TableName: tableName,
        Key: key
    };

    return dynamoDb.delete(params).promise();
};

async function getItem(tableName, key) {
    const params = {
        TableName: tableName,
        Key: key
    };
    const res = await dynamoDb.get(params).promise();
    return res.Item || null;
}

/**
 * Scan (NOT recommended for very large tables) with optional limit and projection
 * @param {string} tableName
 * @param {object} options { limit, projection }
 */
async function listItems(tableName, options = {}) {
    const params = { TableName: tableName };
    if (options.projection) params.ProjectionExpression = options.projection;
    if (options.limit) params.Limit = options.limit;
    const res = await dynamoDb.scan(params).promise();
    return res.Items || [];
}

module.exports = {
    createItem,
    updateItem,
    queryItems,
    generateUniqueId,
    deleteItem,
    getItem,
    listItems
};
