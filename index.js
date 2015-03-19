'use strict';
/* globals module, require */

var winston = module.parent.require('winston'),
    async = module.parent.require('async'),
    nconf = module.parent.require('nconf'),

    Meta = module.parent.require('./meta'),
    User = module.parent.require('./user'),
    Posts = module.parent.require('./posts'),
    Topics = module.parent.require('./topics'),
    Privileges = module.parent.require('./privileges'),
    SocketPosts = module.parent.require('./socket.io/posts'),

    mandrill,
    Emailer = {
        settings: {}
    };

Emailer.init = function(data, callback) {

    var render = function(req, res) {
        res.render('admin/plugins/emailer-mandrill', {
            url: nconf.get('url')
        });
    };

    Meta.settings.get('mandrill', function(err, settings) {
        Emailer.settings = Object.freeze(settings);
        Emailer.receiptRegex = new RegExp('^reply-([\\d]+)@' + Emailer.settings.receive_domain + '$');

        if (!err && settings && settings.apiKey) {
            mandrill = require('node-mandrill')(settings.apiKey || 'Replace Me');
        } else {
            winston.error('[plugins/emailer-mandrill] API key not set!');
        }

        data.router.get('/admin/plugins/emailer-mandrill', data.middleware.admin.buildHeader, render);
        data.router.get('/api/admin/plugins/emailer-mandrill', render);
        data.router.head('/emailer-mandrill/reply', function(req, res) {
            res.sendStatus(200);
        });
        data.router.post('/emailer-mandrill/reply', Emailer.receive);

        if (typeof callback === 'function') {
            callback();
        }
    });
};

Emailer.send = function(data) {
    if (mandrill) {
        var headers = {};

        if (data.pid && Emailer.settings.hasOwnProperty('receive_domain')) {
            headers['Reply-To'] = 'reply-' + data.pid + '@' + Emailer.settings.receive_domain;
        }

        async.waterfall([
            function(next) {
                if (data.fromUid) {
                    next(null, data.fromUid);
                } else if (data.pid) {
                    Posts.getPostField(data.pid, 'uid', next);
                } else {
                    next(null, false);
                }
            },
            function(uid, next) {
                if (uid === false) { return next(null, {}); }

                User.getUserFields(parseInt(uid, 10), ['email', 'username'], function(err, userData) {
                    next(null, userData);
                });
            },
            function(userData, next) {
                mandrill('/messages/send', {
                    message: {
                        to: [{email: data.to, name: data.toName}],
                        subject: data.subject,
                        from_email: userData.email || data.from,
                        from_name: userData.username ? userData.username : undefined,
                        html: data.html,
                        text: data.plaintext,
                        auto_text: !!!data.plaintext,
                        headers: headers
                    }
                }, next);
            }
        ], function (err, response) {
            if (!err) {
                winston.verbose('[emailer.mandrill] Sent `' + data.template + '` email to uid ' + data.uid);
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

    winston.debug('POST from Mandrill contained ' + events.length + ' items');

    async.eachLimit(events, 5, function(eventObj, next) {
        async.waterfall([
            async.apply(Emailer.verifyEvent, eventObj),
            Emailer.resolveUserOrGuest,
            Emailer.processEvent,
            Emailer.notifyUsers
        ], function(err) {
            Emailer.handleError(err, eventObj);
            next(); // Don't block the continued handling of received events!
        });
    }, function() {
        res.sendStatus(200);
    });
};

Emailer.verifyEvent = function(eventObj, next) {
    // This method verifies that
    //   - the "replyTo pid" is present in the "to" field
    //   - the pid belongs to a valid tid
    // This method also saves `pid` and `tid` into eventObj, and returns it.
    // Returns false if any of the above fail/do not match.
    var pid, match;
    eventObj.msg.to.forEach(function(recipient) {
        match = recipient[0].match(Emailer.receiptRegex);
        if (match && match[1]) { pid = match[1]; }
    });

    if (pid) {
        eventObj.pid = pid;

        Posts.getPostField(pid, 'tid', function(err, tid) {
            if (!err && tid) {
                eventObj.tid = tid;
                next(null, eventObj);
            } else {
                if (!tid) { winston.warn('[emailer.mandrill.verifyEvent] Could not retrieve tid'); }
                next(new Error('invalid-data'));
            }
        });
    } else {
        winston.warn('[emailer.mandrill.verifyEvent] Could not locate post id');
        next(new Error('invalid-data'));
    }
};

Emailer.resolveUserOrGuest = function(eventObj, callback) {
    // This method takes the event object, reads the sender email and resolves it to a uid
    // if the email is set in the system. If not, and guest posting is enabled, the email
    // is treated as a guest instead.
    User.getUidByEmail(eventObj.msg.from_email, function(err, uid) {
        if (uid) {
            eventObj.uid = uid;
            callback(null, eventObj);
        } else {
            // See if guests can post to the category in question
            async.waterfall([
                async.apply(Topics.getTopicField, eventObj.tid, 'cid'),
                function(cid, next) {
                    Privileges.categories.groupPrivileges(cid, 'guests', next);
                }
            ], function(err, privileges) {
                if (privileges['groups:topics:reply']) {
                    eventObj.uid = 0;

                    if (parseInt(Meta.config.allowGuestHandles, 10) === 1) {
                        if (eventObj.msg.from_name && eventObj.msg.from_name.length) {
                            eventObj.handle = eventObj.msg.from_name;
                        } else {
                            eventObj.handle = eventObj.msg.from_email;
                        }
                    }

                    callback(null, eventObj);
                } else {
                    // Guests can't post here
                    winston.verbose('[emailer.mandrill] Received reply by guest to pid ' + eventObj.pid + ', but guests are not allowed to post here.');
                    callback(null, false);
                }
            });
        }
    });
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
        content: eventObj.msg.text,
        handle: (eventObj.uid === 0 && eventObj.hasOwnProperty('handle') ? eventObj.handle : undefined)
    }, callback);
};

Emailer.notifyUsers = function(postData, next) {
    var result = {
            posts: [postData],
            privileges: {
                'topics:reply': true
            },
            'reputation:disabled': parseInt(Meta.config['reputation:disabled'], 10) === 1,
            'downvote:disabled': parseInt(Meta.config['downvote:disabled'], 10) === 1,
        };

    SocketPosts.notifyOnlineUsers(parseInt(postData.uid, 10), result);
    next();
};

Emailer.handleError = function(err, eventObj) {
    if (err) {
        switch(err.message) {
            case 'invalid-data':
                // Bounce a return back to sender
                break;
        }
    }
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