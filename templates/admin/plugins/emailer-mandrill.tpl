<div class="acp-page-container">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="row m-0">
		<div id="spy-container" class="col-12 px-0 mb-4" tabindex="0">

			<div class="">
				<div class="card">
					<div class="card-body">
						<blockquote>
							<p class="mb-0">
								Mandrill is a programmable email platform. It allows your application to become a fully featured email server. Send, receive and track messages with ease using your favorite programming language.
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
									<div class="col-12 col-sm-6">
										<label class="form-label" for="apiKey">API Key</label>
										<input placeholder="Api Key here" type="text" class="form-control" id="apiKey" name="apiKey" />
									</div>
								</div>
							</fieldset>
						</form>
					</div>
				</div>
				<div class="card">

					<div class="card-body">
						<h5 class="card-title">Incoming Email Settings</h5>
						<p>
							This plugin can also be configured to receive emails if configured properly via Mandrill.
						</p>
						<p>
							Follow these instructions:
						</p>
						<ol>
							<li>
								<a href="http://help.mandrill.com/entries/21699367-Inbound-Email-Processing-Overview">Set up your incoming email domain</a>
							</li>
							<li>
								Specify your incoming email domain the field below
							</li>
							<li>
								Establish the following routes (<a href="https://mandrillapp.com/inbound/routes">configurable in this page</a>):
								<ul>
									<li><code>reply-*</code>, post to URL: <code>{base_url}/emailer-mandrill/reply</code></li>
								</ul>
							</li>
						</ol>
						<form role="form" class="mandrill-settings">
							<fieldset>
								<div class="row">
									<div class="col-12 col-sm-6">
										<label class="form-label" for="receive_domain">Incoming Domain</label>
										<input placeholder="example.org" type="text" class="form-control" id="receive_domain" name="receive_domain" />
									</div>
								</div>
							</fieldset>
						</form>
					</div>
				</div>
			</div>
		</div>

		<!-- IMPORT admin/partials/settings/toc.tpl -->
	</div>
</div>


