const assert = require('chai').assert;
const fixture = require('./emailsFixture');
const isoDateString = new Date().toISOString().slice(0, 10);

const validateHtml = (email) => {
    // Body
    assert.match(email.html.body, /^<div dir="ltr">/, 'HTML body should match');

    // Links
    assert.equal(email.html.links.length, 3, 'Should have HTML links');
    assert.equal(email.html.links[0].href, 'https://mailosaur.com/', 'First link should have href');
    assert.equal(email.html.links[0].text, 'mailosaur', 'First link should have text');
    assert.equal(email.html.links[1].href, 'https://mailosaur.com/', 'Second link should have href');
    assert.isUndefined(email.html.links[1].text, 'Second link should have no text');
    assert.equal(email.html.links[2].href, 'http://invalid/', 'Third link should have href');
    assert.equal(email.html.links[2].text, 'invalid', 'Third link should have text');

    // Images
    assert.match(email.html.images[1].src, /cid\:/);
    assert.equal(email.html.images[1].alt, 'Inline image 1', 'Second image should have alt text');
};

const validateText = (email) => {
    // Body
    assert.match(email.text.body, /^this is a test/);
        
    // Links
    assert.equal(email.text.links.length, 2, 'Should have Text links');
    assert.equal(email.text.links[0].href, 'https://mailosaur.com/', 'First link should have href');
    assert.equal(email.text.links[0].text, email.text.links[0].href, 'First text link href & text should match');
    assert.equal(email.text.links[1].href, 'https://mailosaur.com/', 'Second link should have href');
    assert.equal(email.text.links[1].text, email.text.links[1].href, 'Second text link href & text should match');
};

const validateHeaders = (expected, actual) => {
    var expectedFromHeader = expected.from[0].name + ' <' + expected.from[0].address + '>';
    var expectedToHeader = expected.to[0].name + ' <' + expected.to[0].address + '>';

    // Fallback casing is used, as header casing is determined by sending server
    assert.equal(actual.headers['from'] || actual.headers['From'], expectedFromHeader, 'From header should be accurate');
    assert.equal(actual.headers['to'] || actual.headers['To'], expectedToHeader, 'To header should be accurate');
    assert.equal(actual.headers['subject'] || actual.headers['Subject'], expected.subject, 'Subject header should match email subject');
};

const validateMetadata = (email) => {
    assert.equal(email.from.length, 1);
    assert.equal(email.to.length, 1);
    assert.isNotEmpty(email.from[0].address);
    assert.isNotEmpty(email.from[0].name);
    assert.isNotEmpty(email.to[0].address);
    assert.isNotEmpty(email.to[0].name);
    assert.isNotEmpty(email.subject);
    assert.isNotEmpty(email.senderhost);
    assert.isNotEmpty(email.server);

    assert.equal(email.received.toISOString().slice(0, 10), isoDateString);
};

const validateAttachmentMetadata = (email) => {
    assert.equal(email.attachments.length, 2, 'Should have attachments');

    var file1 = email.attachments[0];
    assert.isOk(file1.id, 'First attachment should have file id');
    assert.equal(file1.length, 82138, 'First attachment should be correct size');
    assert.equal(file1.fileName, 'cat.png', 'First attachment should have filename');
    assert.equal(file1.creationDate.toISOString().slice(0, 10), isoDateString, 'First attachment should have creation date of today');
    assert.equal(file1.contentType, 'image/png', 'First attachment should have correct MIME type');

    var file2 = email.attachments[1];
    assert.isOk(file2.id, 'Second attachment should have file id');
    assert.equal(file2.length, 212080, 'Second attachment should be correct size');
    assert.equal(file2.fileName, 'dog.png', 'Second attachment should have filename');
    assert.equal(file2.creationDate.toISOString().slice(0, 10), isoDateString, 'First attachment should have creation date of today');
    assert.equal(file2.contentType, 'image/png', 'Second attachment should have correct MIME type');
};

const validateEmail = (email) => {
    validateMetadata(email);
    validateAttachmentMetadata(email);
    validateHtml(email);
    validateText(email);
};

const validateEmailSummary = (email) => {
    validateMetadata(email);
    validateAttachmentMetadata(email);
};

describe('emails', () => {
    let emails;

    before((done) => {
        fixture.init()
            .then((results) => {
                emails = results;
                for (var i = 0; i < emails.length; i++) {
                    validateEmailSummary(emails[i]);
                }

                done();
            })
            .catch(done);
    });

    describe('get', () => {
        it('should return a single email', (done) => {
            fixture.client.messages.get(emails[0].id)
                .then((email) => {
                    validateEmail(email);
                    validateHeaders(emails[0], email);
                    done();
                })
                .catch(done);
        });

        it('should throw an error if email not found', (done) => {
            fixture.client.messages.get('efe907e9-74ed-4113-a3e0-a3d41d914765')
                .catch((err) => {
                    assert.isNotEmpty(err);
                    done();
                });
        });
    });

    describe('waitFor', () => {
        it('should return a match once found', (done) => {
            var host = process.env.MAILOSAUR_SMTP_HOST || 'mailosaur.io';
            var testEmailAddress = `wait_for_test.${fixture.server}@${host}`;
            fixture.sendEmail(fixture.server, testEmailAddress)
                .then(() => {
                    return fixture.client.messages.waitFor(fixture.server, {
                        sentTo: testEmailAddress
                    });
                })
                .then((email) => {
                    validateEmail(email);
                    done();
                })
                .catch(done);
        });
    });

    describe('search', () => {
        it('should throw an error if no criteria', (done) => {
            fixture.client.messages
                .search(fixture.server, {})
                .catch((err) => {
                    assert.isNotEmpty(err);
                    done();
                });
        });

        describe('by sentTo', () => {
            it('should return matching results', (done) => {
                var targetEmail = emails[1];
                fixture.client.messages
                    .search(fixture.server, {
                        sentTo: targetEmail.to[0].address
                    })
                    .then((results) => {
                        assert.equal(results.length, 1);
                        assert.equal(results[0].to[0].address, targetEmail.to[0].address);
                        assert.equal(results[0].subject, targetEmail.subject);
                        done();
                    })
                    .catch(done);
            });

            it('should throw an error on invalid email address', (done) => {
                fixture.client.messages
                    .search(fixture.server, {
                        sentTo: '.not_an_email_address'
                    })
                    .catch((err) => {
                        assert.isNotEmpty(err);
                        done();
                    });
            });
        });

        describe('by body', () => {
            it('should return matching results', (done) => {
                var targetEmail = emails[1];
                var uniqueString = targetEmail.subject.substr(0, targetEmail.subject.indexOf(' subject'));
                fixture.client.messages
                    .search(fixture.server, {
                        body: uniqueString + ' html'
                    })
                    .then((results) => {
                        assert.equal(results.length, 1);
                        assert.equal(results[0].to[0].address, targetEmail.to[0].address);
                        assert.equal(results[0].subject, targetEmail.subject);
                        done();
                    })
                    .catch(done);
            });
        });

        describe('by subject', () => {
            it('should return matching results', (done) => {
                var targetEmail = emails[1];
                var uniqueString = targetEmail.subject.substr(0, targetEmail.subject.indexOf(' subject'));
                fixture.client.messages
                    .search(fixture.server, {
                        subject: uniqueString
                    })
                    .then((results) => {
                        assert.equal(results.length, 1);
                        assert.equal(results[0].to[0].address, targetEmail.to[0].address);
                        assert.equal(results[0].subject, targetEmail.subject);
                        done();
                    })
                    .catch(done);
            });
        });
    });

    describe('spamAnalysis', () => {
        it('should perform a spam analysis on an email', (done) => {
            var targetId = emails[0].id;
            fixture.client.analysis.spam(targetId)
                .then((result) => {
                    assert.equal(result.emailId, targetId);

                    result.spamAssassin.forEach((rule) => {
                        assert.isNumber(rule.score);
                        assert.isOk(rule.rule);
                        assert.isOk(rule.description);
                    });

                    done();
                })
                .catch(done);
        });
    });

    describe('del', () => {
        it('should delete an email', (done) => {
            var targetEmailId = emails[4].id;

            fixture.client.messages.del(targetEmailId)
                .then(done)
                .catch(done)
        });

        it('should fail if attempting to delete again', (done) => {
            var targetEmailId = emails[4].id;
            
            fixture.client.messages.del(targetEmailId)
                .catch((err) => {
                    assert.isNotEmpty(err);
                    done();
                });
        })
    });
});
