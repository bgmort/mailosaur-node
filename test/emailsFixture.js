const MailosaurClient = require('../lib/mailosaur');
const nodemailer = require('nodemailer');
const fs = require('fs');
const assert = require('chai').assert;
const html = fs.readFileSync(__dirname + '/resources/testEmail.html', 'utf-8');
const text = fs.readFileSync(__dirname + '/resources/testEmail.txt', 'utf-8');

const apiKey = process.env.MAILOSAUR_API_KEY;
const server = process.env.MAILOSAUR_SERVER;
const baseUrl = process.env.MAILOSAUR_BASE_URL;

if (!apiKey || !server) {
    throw new Error('Missing necessary environment variables - refer to README.md');
}

const smtpTransport = nodemailer.createTransport({
    host: process.env.MAILOSAUR_SMTP_HOST || 'mailosaur.io',
    port: process.env.MAILOSAUR_SMTP_PORT || '25',
    secureConnection: false,
    ignoreTLS: false,
    tls: {
        // Do not fail on certificate mismatch
        rejectUnauthorized: false
    }
});

const fixture = {
    server: server,
    
    init: function() {
        var self = this;
        
        return new Promise((resolve, reject) => {
            if (self.emails) {
                return resolve(self.emails);
            }

            self.client = new MailosaurClient(apiKey, baseUrl);

            // To ensure reduce duplication and to ensure tests
            // are unaffected by emails being deleted mid-run,
            // this contructor performs tests of:
            //   - Emails.DeleteAll
            //   - Emails.List
            self.client.messages.deleteAll(server)
                .then(() => {
                    return self.sendEmails(server, 5);
                })
                .then(() => {
                    return self.client.messages.list(server);
                })
                .then((emails) => {
                    self.emails = emails;
                    assert.equal(emails.length, 5);
                    return resolve(emails);
                })
                .catch(reject);
        });
    },

    sendEmails: function(server, quantity) {
        var self = this,
            promises = [];

        return new Promise((resolve, reject) => {
            for (var i = 0; i < quantity; i++) {
                promises.push(self.sendEmail(server));
            }

            Promise.all(promises)
                .then(() => {
                    // Wait to ensure email has arrived
			        setTimeout(resolve, 2000);
                })
                .catch(reject);
        });
    },

    sendEmail: function(server, sendToAddress) {
        let randomString = (Math.random() + 1).toString(36).substring(7);
        let randomFromAddress = this.client.servers.generateEmailAddress(server);
        let randomToAddress = sendToAddress || this.client.servers.generateEmailAddress(server);

        return smtpTransport.sendMail({
            subject: randomString + ' subject',
            from: `${randomString} ${randomString} <${randomFromAddress}>`,
            to: `${randomString} ${randomString} <${randomToAddress}>`,
            html: html.replace('REPLACED_DURING_TEST', randomString),
            encoding: 'base64',
            text: text.replace('REPLACED_DURING_TEST', randomString),
            textEncoding: 'base64',
            attachments: [
                {
                    filename: 'cat.png',
                    path: __dirname + '/resources/cat.png',
                    cid: 'ii_1435fadb31d523f6'
                },
                {
                    fileName: 'dog.png',
                    path: __dirname + '/resources/dog.png'
                }
            ]
        });
    }
};

module.exports = fixture;