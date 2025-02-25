
'use strict';

define('admin/plugins/emailer-mandrill', ['settings', 'alerts'], function (settings, alerts) {
	var ACP = {};

	ACP.init = function () {
		settings.load('mandrill', $('.mandrill-settings'));
		$('#save').on('click', saveSettings);
	};

	function saveSettings() {
		settings.save('mandrill', $('.mandrill-settings'), function () {
			alerts.alert({
				type: 'success',
				alert_id: 'mandrill-saved',
				title: 'Settings Saved',
				message: 'Please reload your NodeBB to apply these settings',
				clickfn: function () {
					socket.emit('admin.reload');
				},
			});
		});
	}

	return ACP;
});
