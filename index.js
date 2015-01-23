'use strict';
/* globals module, require, console */

var winston = module.parent.require('winston'),
    async = module.parent.require('async'),

    Meta = module.parent.require('./meta'),
    User = module.parent.require('./user'),
    Posts = module.parent.require('./posts'),
    Topics = module.parent.require('./topics'),

    mandrill,
    Emailer = {
        receiptRegex: /^reply-([\d]+)@dev.nodebb.org$/
    };

Emailer.init = function(data, callback) {

    var render = function(req, res) {
        res.render('admin/plugins/emailer-mandrill', {});
    };

    Meta.settings.get('mandrill', function(err, settings) {
        if (!err && settings && settings.apiKey) {
            mandrill = require('node-mandrill')(settings.apiKey || 'Replace Me');
        } else {
            winston.error('[plugins/emailer-mandrill] API key not set!');
        }

        data.router.get('/admin/plugins/emailer-mandrill', data.middleware.admin.buildHeader, render);
        data.router.get('/api/admin/plugins/emailer-mandrill', render);
        data.router.head('/emailer-mandrill', function(req, res) {
            res.sendStatus(200);
        });
        data.router.post('/emailer-mandrill', Emailer.receive);

        if (typeof callback === 'function') {
            callback();
        }
    });
};

Emailer.send = function(data) {
    if (mandrill) {
        mandrill('/messages/send', {
            message: {
                to: [{email: data.to, name: data.toName}],
                subject: data.subject,
                from_email: data.from,
                html: data.html,
                text: data.plaintext,
                auto_text: !!!data.plaintext
            }
        }, function (err, response) {
            if (!err) {
                winston.info('[emailer.mandrill] Sent `' + data.template + '` email to uid ' + data.uid);
            } else {
                winston.warn('[emailer.mandrill] Unable to send `' + data.template + '` email to uid ' + data.uid + '!!');
                winston.warn('[emailer.mandrill] Error Stringified:' + JSON.stringify(err));
            }
        });
    } else {
        winston.warn('[plugins/emailer-mandrill] API key not set, not sending email as Mandrill object is not instantiated.');
    }
};

Emailer.receive = function(req, res) {
    var events;

    try {
        events = JSON.parse(req.body.mandrill_events);
    } catch (err) {
        winston.error('[emailer.mandrill] Error parsing response JSON from Mandrill API "Receive" webhook');
        return res.sendStatus(400);
    }

    console.log('POST from Mandrill contained ' + events.length + ' items');

    async.eachLimit(events, 5, function(eventObj, next) {
        async.waterfall([
            async.apply(Emailer.verifyEvent, eventObj),
            Emailer.processEvent
        ], next);
    }, function(err) {
        console.log('done!');
    });
    // events.forEach(function(eventObj, idx) {
        // console.log('Event', idx+1);
        // console.log('Time', eventObj.ts);
        // console.log('From', eventObj.msg.from_email);
        // console.log('Text', eventObj.msg.text);
        // console.log('Sender', eventObj.msg.sender);
        // console.log('To', eventObj.msg.to);
        // console.log('');
    // });

    res.sendStatus(200);
};

Emailer.verifyEvent = function(eventObj, next) {
    // This method verifies that
    //   - the "replyTo pid" is present in the "to" field
    //   - the "from" email corresponds to a user's email
    //   - the pid belongs to a valid tid
    // This method also saves `uid`, `pid`, and `tid` into eventObj, and returns it.
    // Returns false if any of the above fail/do not match.
    var pid, match;
    eventObj.msg.to.forEach(function(recipient) {
        match = recipient[0].match(Emailer.receiptRegex);
        if (match && match[1]) { pid = match[1]; }
    });

    if (pid) {
        eventObj.pid = pid;

        async.parallel({
            uid: async.apply(User.getUidByEmail, eventObj.msg.from_email),
            tid: async.apply(Posts.getPostField, pid, 'tid')
        }, function(err, data) {
            if (!err && data.uid && data.tid) {
                eventObj.uid = data.uid;
                eventObj.tid = data.tid;
                next(null, eventObj);
            } else {
                if (!data.uid) { winston.warn('[emailer.mandrill.verifyEvent] Could not retrieve uid'); }
                if (!data.tid) { winston.warn('[emailer.mandrill.verifyEvent] Could not retrieve tid'); }
                next(undefined, false);
            }
        });
    } else {
        winston.warn('[emailer.mandrill.verifyEvent] Could not locate post id');
        next(undefined, false);
    }
};

Emailer.processEvent = function(eventObj, callback) {
    if (!eventObj) {
        return callback();
    }

    winston.verbose('[emailer.mandrill] Processing incoming email reply by uid ' + eventObj.uid + ' to pid ' + eventObj.pid);
    Topics.reply({
        uid: eventObj.uid,
        toPid: eventObj.pid,
        tid: eventObj.tid,
        content: eventObj.msg.text
    }, callback);
};

Emailer.admin = {
    menu: function(custom_header, callback) {
        custom_header.plugins.push({
            'route': '/plugins/emailer-mandrill',
            'icon': 'fa-envelope-o',
            'name': 'Emailer (Mandrill)'
        });

        callback(null, custom_header);
    }
};

module.exports = Emailer;


