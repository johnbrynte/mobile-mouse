if (typeof Math.sign != "function") {
	Math.sign = function(a) {
		return a >= 0 ? 1 : -1;
	};
}

var socket = io();

var pos = {
	x: 0,
	y: 0
};
var prev = {
	x: 0,
	y: 0
};

var threshold = 0.001;
var scale = 10;

/*
var debug = document.getElementById("debug");
var calibrateEl = document.getElementById("calibrate");
var rawEl = document.getElementById("raw");

calibrateEl.addEventListener("click", function() {
	calibrate();
});

rawEl.addEventListener("click", function() {
	rawData = !rawData;
});
*/

var graphScale = 0.5;

var xaxis = new Axis();
var yaxis = new Axis();
var zaxis = new Axis();

var mouseOnTable = false;
var rawData = false;
var graphDebug = false;
var calibrated = false;
var calibrating = false;
var calibrateTimer = 0;
var calibrationTime = 2;
var calibrationMode;

var xgraph, ygraph, zgraph;

var canvas;
var ctx;
var width = window.innerWidth;
var height = window.innerHeight;

var psize = width * 0.8;
var csize = psize * 0.8;
var clength = Math.PI * csize;
var progressCircleEl = $("#progress-circle").attr({
	r: csize / 2,
	cx: width / 2,
	cy: height / 2
}).css({
	"stroke-dashoffset": clength,
	"stroke-dasharray": clength,
	"stroke-width": csize * 0.1
});
var progressTextEl = $("#progress-text").attr({
	"text-anchor": "middle",
	"x": width / 2,
	"y": height / 2
}).css({
	"font-size": csize * 0.1
});
var calibrateEl = $("#calibrate").click(function() {
	if (!calibrating) {
		calibrate();
	}
});
var touchsize = width * 0.1;

$("svg").click(function(evt) {
	var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	$(this)[0].appendChild(circle);
	circle = $(circle).addClass("touch").attr({
		"r": touchsize / 2,
		"cx": evt.pageX,
		"cy": evt.pageY
	});
	setTimeout(function() {
		circle.remove();
	}, 400);

	if (!calibrated && !calibrating) {
		calibrate();
	} else if (!calibrating) {
		socket.emit("click");
	}
});

if (graphDebug) {
	canvas = document.createElement("canvas");
	ctx = canvas.getContext("2d");
	canvas.width = width;
	canvas.height = height / 2;
	document.body.appendChild(canvas);

	xgraph = new Graph("#faa", canvas.width, canvas.height, graphScale);
	ygraph = new Graph("#aaf", canvas.width, canvas.height, graphScale);
	zgraph = new Graph("#afa", canvas.width, canvas.height, graphScale);
}

function Graph(color, w, h, s) {
	var res = 120;
	var values = [];
	var putIndex = 0;

	this.put = function(val) {
		values[putIndex] = val;
		putIndex = (putIndex + 1) % res;
	};

	this.draw = function(ctx) {
		ctx.beginPath();
		var x, y, l = values.length;
		for (var i = 0; i < l; i++) {
			x = w * (l - i) / l;
			y = h / 2 + (h / s) * values[l - i - 1];
			if (i == 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		}
		ctx.strokeStyle = color;
		ctx.lineWidth = 2;
		ctx.stroke();
	};
}

function calibrate() {
	progressTextEl.hide(100);
	setTimeout(function() {
		progressCircleEl.attr("stroke-dashoffset", clength);
		progressTextEl.html("Calibrating").show(100);
		setTimeout(function() {
			progressCircleEl.show(100);
			xaxis.reset();
			yaxis.reset();
			zaxis.reset();
			xaxis.startIdleCalibration();
			yaxis.startIdleCalibration();
			zaxis.startIdleCalibration();

			calibrateTimer = calibrationTime;
			calibrationMode = 0;
			calibrating = true;
		}, 400);
	}, 500);
}

var lastPoll = Date.now();

window.addEventListener("devicemotion", function(evt) {
	var poll = Date.now();
	var dt = (poll - lastPoll) / 1000;

	var x = evt.accelerationIncludingGravity.x;
	var y = evt.accelerationIncludingGravity.y;
	var z = evt.accelerationIncludingGravity.z;

	if (dt > 0) {
		xaxis.put(x, dt);
		yaxis.put(y, dt);
		zaxis.put(z, dt);

		if (graphDebug) {
			xgraph.put(xaxis.getAcc());
			ygraph.put(xaxis.getVelocity());
			zgraph.put(zaxis.getVariance());
		}

		lastPoll = poll;
	}
});

loop();

//calibrate();

var timer = 0;
var prevTime = Date.now();

function loop() {
	var time = Date.now();
	var delta = (time - prevTime) / 1000;
	prevTime = time;

	timer += delta;

	// calibration
	if (calibrating) {
		calibrateTimer -= delta;
		var progress = 1 - (calibrationMode * calibrationTime + calibrationTime - calibrateTimer) / (2 * calibrationTime);
		progress = Math.min(Math.max(progress, 0), 1);
		progressCircleEl.css("stroke-dashoffset", progress * clength);
		progressTextEl.html("Calibrating   ");

		if (calibrateTimer < 0) {
			xaxis.stopCalibration();
			yaxis.stopCalibration();
			zaxis.stopCalibration();
			switch (calibrationMode) {
				case 0:
					xaxis.startThresholdCalibration();
					yaxis.startThresholdCalibration();
					zaxis.startThresholdCalibration();
					calibrateTimer = calibrationTime;
					break;
				case 1:
					progressCircleEl.css("stroke-dashoffset", 0);
					progressTextEl.html("Done!");
					calibrating = false;
					calibrated = true;
					setTimeout(function() {
						progressCircleEl.hide(200);
						progressTextEl.hide(200);
						calibrateEl.show(200);
					}, 800);
					break;
			}
			calibrationMode++;
		}
	} else {
		if (zaxis.atRest()) {
			socket.emit("move", {
				x: xaxis.getPos() * 10000,
				y: -yaxis.getPos() * 10000
			});
			if (!mouseOnTable) {
				mouseOnTable = true;
			}
		} else {
			if (mouseOnTable) {
				mouseOnTable = false;
			}
		}
		xaxis.resetPos();
		yaxis.resetPos();
	}

	if (timer > 0.1) {
		timer = 0;

		if (graphDebug) {
			ctx.clearRect(0, 0, width, height);

			/*var h = canvas.height;
			// x threshold
			ctx.beginPath();
			ctx.moveTo(0, h / 2 - (h / graphScale) * xThreshold);
			ctx.lineTo(width, h / 2 - (h / graphScale) * xThreshold);
			ctx.moveTo(0, h / 2 + (h / graphScale) * xThreshold);
			ctx.lineTo(width, h / 2 + (h / graphScale) * xThreshold);
			ctx.lineWidth = 2;
			ctx.strokeStyle = "#ccc";
			ctx.stroke();
			// y threshold
			ctx.beginPath();
			ctx.moveTo(0, h / 2 - (h / graphScale) * yThreshold);
			ctx.lineTo(width, h / 2 - (h / graphScale) * yThreshold);
			ctx.moveTo(0, h / 2 + (h / graphScale) * yThreshold);
			ctx.lineTo(width, h / 2 + (h / graphScale) * yThreshold);
			ctx.lineWidth = 2;
			ctx.strokeStyle = "#ccc";
			ctx.stroke();*/

			xgraph.draw(ctx);
			ygraph.draw(ctx);
			zgraph.draw(ctx);
		}
	}
	window.requestAnimationFrame(loop);
}

function roundOff(val, num) {
	var dec = Math.pow(10, num);
	return Math.floor(val * dec) / dec;
}