/*
 * Copyright (c) 2016-2021  Moddable Tech, Inc.
 *
 *   This file is part of the Moddable SDK Runtime.
 *       
 *   The Moddable SDK Runtime is free software: you can redistribute it and/or modify    
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   The Moddable SDK Runtime is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 *  
 *   You should have received a copy of the GNU Lesser General Public License
 *   along with the Moddable SDK Runtime.  If not, see <http://www.gnu.org/licenses/>. 
 *
 */ 
/*
    BMP85,BMP180 - temp/pressure
    Implementation based on Adafruit https://github.com/adafruit/Adafruit-BMP085-Library
*/

import Timer from "timer";

const Register = Object.freeze({
	BMP180_CONTROL: 0xF4,
	BMP180_RESULT: 0xF6,
	BMP180_CHIPID: 0xD0,
	CMD_TEMP: 0x2E,
	CMD_PRES: 0x34
});

const Config = Object.freeze({
	Mode: {
		ULTRALOWPOWER:	0x00,
		STANDARD:		0x01,
		HIGHRES:		0x02,
		ULTRAHIGHRES:	0x03
	}
});

class aHostObject @ "xs_bmp180_host_object_destructor" {
	constructor() @ "xs_bmp180_host_object_constructor";
}

class BMP180 extends aHostObject {
	#io;
	#calib;
	#byteBuffer = new Uint8Array(1);
	#wordBuffer = new Uint8Array(2);
	#valueBuffer = new Uint8Array(3);
	#mode = Config.Mode.ULTRALOWPOWER;

	constructor(options) {
		super(options);
		const io = this.#io = new (options.io)({
			...options,
			hz: 100_000,
			address: 0x77
		});

		this.#byteBuffer[0] = Register.BMP180_CHIPID;
		io.write(this.#byteBuffer);
		if (0x55 !== io.read(this.#byteBuffer)[0])
			throw new Error("unexpected sensor");

		this.initialize();
		this.configure(options);
	}
	configure(options) {
		if (undefined !== options.mode)
			this.#mode = options.mode;
	}
	calculate(rawTemp, rawPressure, mode) @ "xs_bmp180_calculate";
	setCalibration(calibrate) @ "xs_bmp180_setCalibration";
	close() @ "xs_bmp180_close";
	sample() {
		const io = this.#io;
		const bBuf = this.#byteBuffer;
		const wBuf = this.#wordBuffer;

		wBuf[0] = Register.BMP180_CONTROL;
		wBuf[1] = Register.CMD_TEMP;
		io.write(wBuf);
		Timer.delay(5);

		let temp = this.readUInt(Register.BMP180_RESULT);

		wBuf[0] = Register.BMP180_CONTROL;
		wBuf[1] = Register.CMD_PRES + (this.#mode << 6);
		io.write(wBuf);
		switch (this.#mode) {
			case Config.Mode.STANDARD: Timer.delay(8); break;
			case Config.Mode.HIGHRES: Timer.delay(14); break;
			case Config.Mode.ULTRAHIGHRES: Timer.delay(26); break;
			default: delay(5); break;
		}

		bBuf[0] = Register.BMP180_RESULT;
		io.write(bBuf);
		io.read(this.#valueBuffer);

		let pr = (this.#valueBuffer[0] << 16) | (this.#valueBuffer[1] << 8) | this.#valueBuffer[2];
		pr >>= (8 - this.#mode);

		return this.calculate(temp, pr, this.#mode);
	}
	initialize() {
		let calib = {};
		calib.AC1 = this.readInt(0xAA);
		calib.AC2 = this.readInt(0xAC);
		calib.AC3 = this.readInt(0xAE);
		calib.AC4 = this.readUInt(0xB0);
		calib.AC5 = this.readUInt(0xB2);
		calib.AC6 = this.readUInt(0xB4);
		calib.B1 = this.readInt(0xB6);
		calib.B2 = this.readInt(0xB8);
		calib.MB = this.readInt(0xBA);
		calib.MC = this.readInt(0xBC);
		calib.MD = this.readInt(0xBE);

		this.setCalibration(calib);
	}
	twoC(val) {
		if (val > 32767)
			val = -(65535 - val + 1);
		return val;
	}
	readUInt(reg) {
		const io = this.#io;
		const bBuf = this.#byteBuffer;
		const wBuf = this.#wordBuffer;
		bBuf[0] = reg;
		io.write(bBuf);
		io.read(wBuf);
		return (wBuf[0] << 8) | wBuf[1];
	}
	readInt(reg) {
		return this.twoC(this.readUInt(reg));
	}
}
Object.freeze(BMP180.prototype);

export { BMP180 as default, BMP180, Config };
