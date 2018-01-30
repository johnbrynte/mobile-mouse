function Average(res) {
	var values = [];
	var putIndex = 0;
	var needsUpdate = true;

	var average, variance, minVal, maxVal;

	function updateValues() {
		if (needsUpdate) {
			// calculate average
			var val = 0,
				l = values.length;
			minVal = 0;
			maxVal = 0;
			values.forEach(function(v) {
				val += v;
				// and min, max
				minVal = Math.min(minVal, v);
				maxVal = Math.max(maxVal, v);
			});
			average = l > 0 ? val / l : 0;
			// calculate variance
			var val = 0;
			values.forEach(function(v) {
				val += Math.pow(v - average, 2);
			});
			variance = l > 0 ? val / l : 0;

			needsUpdate = false;
		}
	}

	this.reset = function() {
		average = 0;
		variance = 0;
		minVal = 0;
		maxVal = 0;
		needsUpdate = true;
	};

	this.put = function(val) {
		values[putIndex] = val;
		putIndex = (putIndex + 1) % res;
		needsUpdate = true;
	};

	this.getAverage = function() {
		updateValues();
		return average;
	};

	this.getVariance = function() {
		updateValues();
		return variance;
	};

	this.getMin = function() {
		updateValues();
		return minVal;
	};

	this.getMax = function() {
		updateValues();
		return maxVal;
	};

	this.valueOf = this.getAverage;
}