'use strict';
/* globals module, require, console */

var winston = module.parent.require('winston'),
    Meta = module.parent.require('./meta'),
    mandrill,
    Emailer = {};

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

Emailer.receive = function(req, res, next) {
    var events = req.body.mandrill_events;
    console.log('POST from Mandrill contained ' + events.length + ' items');

    Array.forEach(events, function(eventObj, idx) {
        console.log('Event', idx+1);
        console.log('Time', eventObj.ts);
        console.log('From', eventObj.from_email);
        console.log('Text', eventObj.text);
    });

    res.sendStatus(200);
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


