var app, commands, config, connect, fs, io, killCommands, sendData, spawn, startProcess;

fs = require('fs');
spawn = require('child_process').spawn;
connect = require('connect');
config = require('./config');

app = connect.createServer(connect['static'](__dirname + '/public')).listen(9099);
io = require('socket.io').listen(app);

io.set('log level', 2);

commands = [];

sendData = function(socket, data, fileData, channel) {
	data = '' + data;
	return socket.emit('new-data', {
		'fileData': fileData,
		'channel': channel,
		'value': data.replace(/(\[[0-9]+m)*/g, "")
	});
};

killCommands = function(commands) {
	var command, fileName, _results;
	_results = [];
	for (fileName in commands) {
		command = commands[fileName];
		console.log("Killing process for " + fileName + "...");
		_results.push(command.kill('SIGTERM'));
	}
	return _results;
};

startProcess = function(socket, fileData) {
	var args, command, fileSlug;

	args = ['-f', '-n 20', fileData.file];
	command = spawn('tail', args);
	//fileData = fileData.replace(/\/.*\//g, '');
	fileSlug = fileData.file.replace(/\./g, '-');
	command.stdout.on('data', function(data) {
		return sendData(socket, data, fileData, 'stdout');
	});
	command.stderr.on('data', function(data) {
		return sendData(socket, data, fileData, 'stderr');
	});
	return commands[fileSlug] = command;
};

io.sockets.on('connection', function(socket) {
	var _i, _len, _results;

	_results = [];
	for (_i = 0, _len = config.logFiles.length; _i < _len; _i++) {
		_results.push(startProcess(socket, config.logFiles[_i]));
	}
	return _results;

	socket.on('disconnect', function() {
		console.log('Client has disconnected, closing the processes...');
		return killCommands(commands);
	});
});

process.on('SIGINT', function() {
	console.log('Server is stopping, closing the processes...');
	killCommands(commands);
	app.close();
	return process.exit();
});

process.on('SIGTERM', function() {
	console.log('Server is stopping, closing the processes...');
	killCommands(commands);
	return app.close();
});
