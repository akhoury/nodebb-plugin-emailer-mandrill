<div class="row">
	<div class="col-lg-9">
		<div class="panel panel-default">
			<div class="panel-heading">Emailer (Mandrill)</div>
			<div class="panel-body">
				<blockquote>
					<p>
						Mandrill is a programmable email platform. It allows your application to become a fully featured email server. Send, receive and track messages with ease using your favorite programming language.<br /><br />
					</p>
				</blockquote>
				<p>
					To get started:
				</p>
				<ol>
					<li>
						Register for an account on <a href="http://mandrill.com">http://mandrill.com</a>. Mandrill offers a free tier with up to 250 free emails hourly.
					</li>
					<li>
					    Find your key, <a target="_blank" href="http://i.imgur.com/Hf0aCJX.png">screenshot-1</a>, <a target="_blank" href="http://i.imgur.com/edlN37G.png">screenshot-2</a>
					</li>
					<li>
						Paste your API key into the field below, hit save, and restart your NodeBB
					</li>
				</ol>
				<form role="form" class="mandrill-settings">
					<fieldset>
						<div class="row">
							<div class="col-sm-6">
								<div class="form-group">
									<label for="apiKey">API Key</label>
									<input placeholder="Api Key here" type="text" class="form-control" id="apiKey" name="apiKey" />
								</div>
							</div>
						</div>
					</fieldset>
				</form>
			</div>
		</div>
		<div class="panel panel-default">
			<div class="panel-heading">Incoming Email Settings</div>
			<div class="panel-body">
				<p>
					This plugin can also be configured to receive emails if configured properly via Mandrill.
				</p>
				<p>
					<a href="http://help.mandrill.com/entries/21699367-Inbound-Email-Processing-Overview">Following these instructions</a>:
				</p>
				<ol>
					<li>
						Set up your incoming email domain
					</li>
					<li>
						Specify your incoming email domain the field below
					</li>
					<li>
					    Establish the following routes:
					    <ul>
					    	<li><code>reply-*</code></li>, post to URL: <code>http://{url}/emailer-mandrill</code>
					    </ul>
					</li>
				</ol>
				<form role="form" class="mandrill-settings">
					<fieldset>
						<div class="row">
							<div class="col-sm-6">
								<div class="form-group">
									<label for="receive_domain">Incoming Domain</label>
									<input placeholder="example.org" type="text" class="form-control" id="receive_domain" name="receive_domain" />
								</div>
							</div>
						</div>
					</fieldset>
				</form>
			</div>
		</div>
	</div>
	<div class="col-lg-3">
		<div class="panel panel-default">
			<div class="panel-heading">Control Panel</div>
			<div class="panel-body">
				<button class="btn btn-primary" id="save">Save Settings</button>
			</div>
		</div>
	</div>
</div>

<script>
	require(['settings'], function(Settings) {
		Settings.load('mandrill', $('.mandrill-settings'));

		$('#save').on('click', function() {
			Settings.save('mandrill', $('.mandrill-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'mandrill-saved',
					title: 'Settings Saved',
					message: 'Please reload your NodeBB to apply these settings',
					clickfn: function() {
						socket.emit('admin.reload');
					}
				})
			});
		});
	});
</script>