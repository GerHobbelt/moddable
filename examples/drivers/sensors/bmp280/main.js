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
import { BMP280, Config } from "embedded:sensor/BMP280";
import Timer from "timer";

const sensor = new BMP280({ ...device.I2C.default,
			mode: Config.Mode.NORMAL,
			tempSampling: Config.Sampling.X2,
			pressureSampling: Config.Sampling.X16,
			filter: Config.Filter.X16,
			standbyDuration: Config.Standby.MS_500 });
		
function CtoF(c) { return (c*1.8)+32; }
function PatoInHg(Pa) { return Pa * 0.0002953; }

Timer.repeat(() => {
	const sample = sensor.sample();

	trace(`Temperature: ${sample.temperature.toFixed(2)} C -- ${CtoF(sample.temperature).toFixed(2)} F\n`);
	trace(`Pressure: ${sample.pressure.toFixed(2)} Pa -- ${PatoInHg(sample.pressure).toFixed(3)} inHg\n`);

}, 10000);

