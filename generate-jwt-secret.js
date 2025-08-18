const crypto = require('crypto');

// Generate a 64-byte random secret key
const secret = crypto.randomBytes(64).toString('hex');

// Log the secret to the console
console.log("Your JWT Secret Key:", secret);
