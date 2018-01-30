var express = require("express");
var app = express();
var http = require("http").Server(app);
var robot = require("robotjs");
var io = require("socket.io")(http);

var ip,
    ifaces = require('os').networkInterfaces();
for (var dev in ifaces) {
    ifaces[dev].filter((details) => details.family === 'IPv4' && details.internal === false ? ip = details.address: undefined);
}

//Speed up the mouse.
robot.setMouseDelay(1);

var screenSize = robot.getScreenSize();
var height = screenSize.height;
var width = screenSize.width;
var pos = robot.getMousePos();

app.use("/app", express.static(__dirname + "/app"));

app.get("/", function(req, res) {
	res.sendFile(__dirname + "/app/index.html");
});

io.on("connection", function(socket) {
	console.log("mouse connected");

	socket.on("move", function(msg) {
		if (msg.x != 0 || msg.y != 0) {
			//pos = robot.getMousePos();
			pos.x += msg.x;
			pos.y += msg.y;
			robot.moveMouse(pos.x, pos.y);
			pos.x = Math.min(width, Math.max(0, pos.x));
			pos.y = Math.min(height, Math.max(0, pos.y));
		}
	});

	socket.on("click", function() {
		robot.mouseClick();
	});
});

http.listen(3000, function(r) {
	if (ip) {
		console.log("Open 'http://" + ip + ":3000' on your phone");
	} else {
		console.log("Could not determine the hosts ip.");
		console.log("Serving on port 3000...");
	}
});