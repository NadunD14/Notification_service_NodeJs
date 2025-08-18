// setup/createDynamoDBTables.js

const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS SDK with your credentials
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Create DynamoDB client
const dynamoDB = new AWS.DynamoDB();

// Define table schemas
const tables = [
    {
        TableName: 'Users',
        KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'userId', AttributeType: 'S' },
            { AttributeName: 'userType', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'userType-index',
                KeySchema: [
                    { AttributeName: 'userType', KeyType: 'HASH' }
                ],
                Projection: {
                    ProjectionType: 'ALL'
                },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    },
    {
        TableName: 'Subscriptions',
        KeySchema: [
            { AttributeName: 'subscriptionId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'subscriptionId', AttributeType: 'S' },
            { AttributeName: 'userId', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'userId-index',
                KeySchema: [
                    { AttributeName: 'userId', KeyType: 'HASH' }
                ],
                Projection: {
                    ProjectionType: 'ALL'
                },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    },
    {
        TableName: 'Notifications',
        KeySchema: [
            { AttributeName: 'notificationId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'notificationId', AttributeType: 'S' },
            { AttributeName: 'adminId', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'adminId-index',
                KeySchema: [
                    { AttributeName: 'adminId', KeyType: 'HASH' }
                ],
                Projection: {
                    ProjectionType: 'ALL'
                },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    }
];

// Function to create tables
async function createTables() {
    for (const tableDefinition of tables) {
        try {
            console.log(`Creating table: ${tableDefinition.TableName}`);
            await dynamoDB.createTable(tableDefinition).promise();
            console.log(`Table created: ${tableDefinition.TableName}`);
        } catch (error) {
            if (error.code === 'ResourceInUseException') {
                console.log(`Table already exists: ${tableDefinition.TableName}`);
            } else {
                console.error(`Error creating table ${tableDefinition.TableName}:`, error);
            }
        }
    }
}

createTables().then(() => {
    console.log('Table creation process completed');
}).catch(error => {
    console.error('Error in table creation process:', error);
});
