/*
 * Copyright (c) 2021  Moddable Tech, Inc.
 *
 *   This file is part of the Moddable SDK.
 *
 *   This work is licensed under the
 *       Creative Commons Attribution 4.0 International License.
 *   To view a copy of this license, visit
 *       <http://creativecommons.org/licenses/by/4.0>.
 *   or send a letter to Creative Commons, PO Box 1866,
 *   Mountain View, CA 94042, USA.
 *
 */

import device from "embedded:provider/builtin";
import Humidity from "embedded:sensor/SI7020";
import Timer from "timer";

const humidity = new Humidity(device.I2C.default);

Timer.repeat(() => {
	const sample = humidity.sample();

	trace(`Temperature: ${sample.temperature.toFixed(2)} C\n`);
	trace(`Humidity: ${sample.humidity.toFixed(2)} %RH\n`);

}, 5000);

