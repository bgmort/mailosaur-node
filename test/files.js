const assert = require('chai').assert;
const fixture = require('./emailsFixture');

describe('files', () => {
    let emails;

    before((done) => {
        fixture.init()
            .then((results) => {
                emails = results;
                done();
            })
            .catch(done);
    });

    describe('getEmail', () => {
        it('should return a file', (done) => {
            var email = emails[0];

            fixture.client.files.getEmail(email.id)
                .then((result) => {
                    assert.isOk(result);
                    assert.isTrue(result.length > 1);
                    assert.isTrue(result.indexOf(email.subject) !== -1);
                    done();
                })
                .catch(done);
        });

        it('should return a file via callback', (done) => {
            var email = emails[0];

            fixture.client.files.getEmail(email.id, (err, result) => {
                assert.isNull(err);
                assert.isOk(result);
                assert.isTrue(result.length > 1);
                assert.isTrue(result.indexOf(email.subject) !== -1);
                done();
            });
        });
    });

    describe('getAttachment', () => {
        it('should return a file', (done) => {
            var email = emails[0];
            var attachment = email.attachments[0];

            fixture.client.files.getAttachment(attachment.id)
                .then((result) => {
                    assert.isOk(result);
                    assert.equal(result.length, attachment.length);
                    done();
                })
                .catch(done);
        });

        it('should return a file via callback', (done) => {
            var email = emails[0];
            var attachment = email.attachments[0];

            fixture.client.files.getAttachment(attachment.id, (err, result) => {
                assert.isNull(err);
                assert.isOk(result);
                assert.equal(result.length, attachment.length);
                done();
            });
        });
    });
});