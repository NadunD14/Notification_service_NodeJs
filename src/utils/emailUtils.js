// utils/emailUtils.js
// using Twilio SendGrid's v3 Node.js Library
// https://github.com/sendgrid/sendgrid-nodejs

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// sgMail.setDataResidency('eu'); 
// uncomment the above line if you are sending mail using a regional EU subuser

/**
 * Send an email notification to the user
 * @param {string} to - The recipient's email address
 * @param {string} subject - The subject of the email
 * @param {string} body - The body content of the email (text)
 * @param {string} html - Optional HTML content of the email
 * @returns {Promise<boolean>} - Returns true if email sent successfully, false otherwise
 */
const sendEmail = async (to, subject, body, html = null) => {
    const msg = {
        to: to, // Change to your recipient
        from: 'kamalamal1414@gmail.com', // Change to your verified sender
        subject: subject,
        text: body,
        html: html || `<p>${body.replace(/\n/g, '<br>')}</p>`, // Convert text to basic HTML if no HTML provided
    };

    try {
        await sgMail.send(msg);
        console.log('Email sent');
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
};

module.exports = {
    sendEmail
};
