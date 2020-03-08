require('console-stamp')(console, { pattern: 'yyyy-mm-dd HH:MM:ss' });

const ssdp = require('node-ssdp');
const lgtv2 = require('lgtv2');
const upnp = require('node-upnp-remote');

const discovery_interval = 60000;

var discover = new ssdp.Client();

var lg;
var dialog;

var lg_ip;
var dialog_ip;
var connected = [];

discover.on('response', function (headers, statusCode, rinfo) {
	if (headers.SERVER.indexOf("WebOS") >= 0) {
		lg_ip = rinfo.address;
		if (!connected.includes(lg_ip)) {
			console.info("Found LG TV at " + lg_ip);
			connect_lg();
		}
	} 

	if (headers.ST == "urn:schemas-upnp-org:service:RenderingControl:2" && (!dialog_ip || (rinfo.address == dialog_ip))) {
		dialog_uri = headers.LOCATION;
		if (!connected.includes(dialog_uri)) {
			console.info("Found Dialog at " + dialog_uri);
			connect_dialog();
		}
	} 
});

function discover_lg()
{
	console.info('Discovering LG TV devices..');
	discover.search('urn:lge:device:tv:1');
	setTimeout(function() {
		discover_lg();
	}, discovery_interval);	
}

function discover_dialog()
{
	console.info('Discovering Devialet dialog devices..');
	discover.search('urn:schemas-upnp-org:service:RenderingControl:2');
	setTimeout(function() {
		discover_dialog();
	}, discovery_interval);	
}

function connect_lg()
{
	console.info("Connecting to LG TV at IP " + lg_ip + "..");
	lg = new lgtv2({ url: 'ws://' + lg_ip + ':3000' });
	lg.on('connect', function() {
		connected.push(lg_ip);
		console.info('Connected to LG TV');

		lg.subscribe('ssap://audio/getVolume', function (err, res) {
			if (res.changed.indexOf('volume') !== -1) 
			{
				console.info('Volume changed on LG', res.volume);
				if (dialog) 
				{
					dialog.setVolume(res.volume);
				}
			}
			if (res.changed.indexOf('muted') !== -1) 
			{
				console.info('Mute changed on LG', res.muted);
				if (dialog) 
				{
					dialog.setMute(res.muted);
				}
			}
		});

	});
}

function connect_dialog()
{
	console.info("Connecting to Dialog at " + dialog_uri  + "..");
	dialog = new upnp({url: dialog_uri});
	console.info('Connected to Dialog');
	connected.push(dialog_uri);
}


var argv = require('yargs').argv;
lg_ip = argv.lg
dialog_ip = argv.dialog

discover_dialog();
if (lg_ip) {
	connect_lg();
}
else {
	discover_lg();
}
