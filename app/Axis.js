function Axis() {

	var idle = 0;
	var threshold = 0;

	var acc = 0;
	var accAvg = new Average(2);
	var accVariance = new Average(10);
	var vel = 0;
	var pos = 0;

	var friction = 1;

	var calibrateAvg = new Average(100);
	var calibrating = 0;

	this.put = function(val, dt) {
		accAvg.put(val - idle);
		accVariance.put(val - idle);
		acc = accAvg.getAverage();
		if (Math.abs(acc) > threshold) {
			acc -= Math.sign(threshold) * threshold;
		} else {
			acc = 0;
		}

		if (calibrating) {
			// are both averages needed?
			calibrateAvg.put(acc);
		} else {
			vel += acc * dt;
			if (this.atRest()) {
				var dec = friction * dt;
				if (dec < Math.abs(vel)) {
					vel -= Math.sign(vel) * dec;
				} else {
					vel = 0;
				}
			}
			pos += vel * dt;
		}
	};

	this.getAcc = function() {
		return acc;
	};

	this.getVelocity = function() {
		return vel;
	};

	this.getPos = function() {
		return pos;
	};

	this.getVariance = function() {
		return accVariance.getVariance();
	};

	this.resetPos = function() {
		pos = 0;
	};

	this.reset = function() {
		idle = 0;
		threshold = 0;

		acc = 0;
		accAvg.reset();
		accVariance.reset();
		vel = 0;
		pos = 0;

		calibrateAvg.reset();
		calibrating = 0;
	};

	this.atRest = function() {
		return accVariance.getVariance() < threshold;
	};

	this.startIdleCalibration = function() {
		calibrating = calibrating | 1;
	};

	this.startThresholdCalibration = function() {
		calibrating = calibrating | 2;
	};

	this.stopCalibration = function() {
		if (calibrating) {
			if (calibrating & 1) {
				idle = accAvg.getAverage();
			}
			if (calibrating & 2) {
				threshold = (accAvg.getMax() - accAvg.getMin()) / 2;
				threshold *= 1;
			}
		}
		accAvg.reset();
		calibrating = 0;
	};
}