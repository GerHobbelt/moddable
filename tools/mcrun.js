/*
 * Copyright (c) 2016-2017  Moddable Tech, Inc.
 *
 *   This file is part of the Moddable SDK Tools.
 * 
 *   The Moddable SDK Tools is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 * 
 *   The Moddable SDK Tools is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 * 
 *   You should have received a copy of the GNU General Public License
 *   along with the Moddable SDK Tools.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

import { FILE } from "tool";
import { MakeFile, PrerequisiteFile, FormatFile, RotationFile, Tool } from "mcmanifest";

var formatStrings = {
	gray16: "Gray16",
	gray256: "Gray256",
	rgb332: "RGB332",
	rgb565le: "RGB565LE",
	rgb565be: "RGB565BE",
	clut16: "CLUT16",
	x: "",
};

class CheckFile extends PrerequisiteFile {
	generate(tool) {
		this.line('/* WARNING: This file is automatically generated. Do not edit. */');
		this.line("");
		this.line('import config from "mc/config";');
		this.line("");
		this.line('export default function() {');
		if (this.hasAssets(tool)) {
			let format = formatStrings[tool.format];
			let rotation = tool.rotation;
			this.line('\tif (config.format != "', format, '")');
			this.line('\t\tthrow new Error("incompatible assets: pixelformat: " + config.format + " instead of ', format, '");');
			this.line('\tif (config.rotation != ', rotation, ')');
			this.line('\t\tthrow new Error("incompatible assets: rotation: " + config.rotation + " instead of ', rotation, '");');
		}
		this.line('}');	
		this.line("");
		this.close();
	}
	hasAssets(tool) {
		if (tool.bmpAlphaFiles.length)
			return true;
		if (tool.bmpColorFiles.length)
			return true;
		if (tool.bmpFontFiles.length)
			return true;
		if (tool.bmpMaskFiles.length)
			return true;
		if (tool.imageFiles.length)
			return true;
		return false;
	}
}

class ConfigFile extends PrerequisiteFile {
	generate(tool) {
		this.line('/* WARNING: This file is automatically generated. Do not edit. */');
		this.line("");
		this.line("export default {");
		for (let key in tool.config) {
			this.write("\t\"");
			this.write(key);
			this.write("\": ");
			this.write(JSON.stringify(tool.config[key], null, "\t"));
			this.line(",");
		}
		this.line("};");
		this.close();
	}
}

class ToDoFile extends FILE {
	constructor(path) {
		super(path)
	}
	generate(tool) {
		let lines = [];
		this.generateModulesRules(tool, lines);
		this.generateResourcesRules(tool, lines);
		this.generateArchiveRule(tool, lines);
		let string = JSON.stringify(lines, null, "\t");
		this.write(string);
		this.close();
	}
	generateArchiveRule(tool, lines) {
		let line = [];
		line.push("xsa");
		line.push("-b");
		line.push(tool.modulesPath);
		line.push("-o");
		line.push(tool.binPath);
		line.push("-r");
		line.push(tool.environment.NAME);
		for (var result of tool.jsFiles) {
			line.push(tool.modulesPath + tool.slash + result.target);
		}
		for (var result of tool.resourcesFiles) {
			line.push(tool.resourcesPath + tool.slash + result.target);
		}
		for (var result of tool.bmpColorFiles) {
			line.push(tool.resourcesPath + tool.slash + result.target);
		}
		for (var result of tool.bmpAlphaFiles) {
			line.push(tool.resourcesPath + tool.slash + result.target);
		}
		for (var result of tool.bmpFontFiles) {
			line.push(tool.resourcesPath + tool.slash + result.target);
		}
		for (var result of tool.bmpMaskFiles) {
			line.push(tool.resourcesPath + tool.slash + result.target);
		}
		for (var result of tool.clutFiles) {
			line.push(tool.resourcesPath + tool.slash + result.target);
		}
		for (var result of tool.imageFiles) {
			line.push(tool.resourcesPath + tool.slash + result.target);
		}
		for (var result of tool.soundFiles) {
			line.push(tool.resourcesPath + tool.slash + result.target);
		}
		for (var result of tool.stringFiles) {
			line.push(tool.resourcesPath + tool.slash + result.target);
		}
		if (tool.stringFiles.length) {
			line.push(tool.resourcesPath + tool.slash + "locals.mhi");
		}
		lines.push(line);
	}
	generateModulesRules(tool, lines) {
		for (var result of tool.jsFiles) {
			var source = result.source;
			var sourceParts = tool.splitPath(source);
			var target = result.target;
			var targetParts = tool.splitPath(target);
			let line = ["xsc"];
			if (tool.debug)
				line.push("-d");
			line.push("-e", source, "-o", tool.modulesPath, "-r", targetParts.name);
			lines.push(line);
		}
	}
	generateResourcesRules(tool, lines) {
		for (var result of tool.resourcesFiles) {
			var source = result.source;
			var target = tool.resourcesPath + tool.slash + result.target;
			let line = ["cp"];
			if (tool.isDirectoryOrFile(source) < 0)
				line.push("-r");
			line.push(source, target);
			lines.push(line);
		}

		if (tool.clutFiles) {
			for (var result of tool.clutFiles) {
				var source = result.source;
				var target = result.target;
				lines.push(["buildclut", source, "-o", tool.resourcesPath]);
			}
		}

		for (var result of tool.bmpAlphaFiles) {
			if (result.colorFile)
				continue
			var parts;
			var source = result.source;
			var target = result.target;
			parts = tool.splitPath(target);
			let line = ["png2bmp"];
			line.push(source);
			var sources = result.sources;
			if (sources) {
				for (var path of sources)
					line.push(path);
				line.push("-n", parts.name.slice(0, -6));
			}
			line.push("-a", "-o", tool.resourcesPath, "-r", tool.rotation.toString());
			lines.push(line);
		}

		for (var result of tool.bmpColorFiles) {
			var parts;
			var source = result.source;
			var target = result.target;
			parts = tool.splitPath(target);
			var alphaTarget = result.alphaFile ? result.alphaFile.target : null;
			var clutSource = result.clutName ? tool.resourcesPath + tool.slash + result.clutName + ".cct" : null;
			var sources = result.sources;
			let line = ["png2bmp"];
			line.push(source);
			if (sources) {
				for (var path of sources)
					line.push(path);
				line.push("-n", parts.name.slice(0, -6));
			}
			line.push("-f", tool.format, "-o", tool.resourcesPath, "-r", tool.rotation.toString());
			if (!alphaTarget)
				line.push("-c");
			if (clutSource)
				line.push("-clut", clutSource);
			lines.push(line);
		}

		for (var result of tool.bmpFontFiles) {
			var parts;
			var source = result.source;
			parts = tool.splitPath(source);
			parts.extension = ".png";
			var pngSource = tool.joinPath(parts);
			var target = result.target;
			parts = tool.splitPath(target);
			var bmpTarget = parts.name + "-alpha.bmp";
			var bmpSource = tool.resourcesPath + tool.slash + bmpTarget;
			let line = ["png2bmp"];
			line.push(pngSource, "-a", "-o", tool.resourcesPath, "-r", tool.rotation.toString(), "-t");
			lines.push(line);
			line = ["compressbmf"];
			line.push(source, "-i", bmpSource, "-o", tool.resourcesPath, "-r", tool.rotation.toString());
			lines.push(line);
		}

		for (var result of tool.bmpMaskFiles) {
			var parts;
			var source = result.source;
			var target = result.target;
			parts = tool.splitPath(target);
			var bmpTarget = parts.name + ".bmp";
			var bmpSource = tool.resourcesPath + tool.slash + bmpTarget;
			var sources = result.sources;
			let line = ["png2bmp"];
			line.push(source);
			if (sources) {
				for (var path of sources)
					line.push(path);
				line.push("-n", parts.name.slice(0, -6));
			}
			line.push("-a", "-o", tool.resourcesPath, "-r", tool.rotation.toString(), "-t", name);
			lines.push(line);
			lines.push(["rle4encode ", bmpSource, "-o", tool.resourcesPath]);
		}

		for (var result of tool.imageFiles) {
			var source = result.source;
			var target = result.target;
			if (result.quality !== undefined) {
				var temporary = target + result.quality;
				lines.push(["image2cs", source, "-o", tool.resourcesPath, "-q", result.quality, "-r", tool.rotation.toString()]);
				lines.push(["cp", tool.resourcesPath + tool.slash + temporary, tool.resourcesPath + tool.slash + result.target]);
			}
			else {
				lines.push(["image2cs", source, "-o", tool.resourcesPath, "-r", tool.rotation.toString()]);
			}
		}

		let bitsPerSample = 16, numChannels = 1, sampleRate = 11025, audioFormat = "uncompressed";
		let defines = tool.defines;
		if (defines) {
			let audioOut = defines.audioOut;
			if (audioOut) {
				if ("bitsPerSample" in audioOut) bitsPerSample = audioOut.bitsPerSample;
				if ("numChannels" in audioOut) numChannels = audioOut.numChannels;
				if ("sampleRate" in audioOut) sampleRate = audioOut.sampleRate;
				if ("format" in audioOut) audioFormat = audioOut.format;
			}
		}
		for (var result of tool.soundFiles) {
			var source = result.source;
			var target = result.target;
			lines.push(["wav2maud", source, "-o", tool.resourcesPath, "-r", sampleRate.toString(), "-c", numChannels.toString(), "-s", bitsPerSample.toString(), "-f", audioFormat]);
		}
		if (tool.stringFiles.length) {
			let line = ["mclocal"];
			for (var result of tool.stringFiles)
				line.push(result.source);
			if (!defines || !defines.locals || !defines.locals.all)
				line.push("-d");
			if (tool.format)
				line.push("-s");
			line.push("-o", tool.resourcesPath);
			lines.push(line);
		}
	}
}

export default class extends Tool {
	constructor(argv) {
		super(argv);
		if (this.platform == "wasm") {
			this.fragmentPath = null;
		}
		else {
			var path = this.moddablePath + this.slash + "tools" + this.slash + "mcrun" + this.slash;
			if (this.windows)
				path += "nmake.";
			else
				path += "make.";
			path += this.platform + ".mk";
			path = this.resolveFilePath(path);
			if (!path)
				throw new Error("unknown platform!");
			this.fragmentPath = path;
		}
	}
	createDirectories(path, first, last) {
		this.createDirectory(path);
		path += this.slash + first;
		this.createDirectory(path);
		path += this.slash + this.platform;
		this.createDirectory(path);
		if (this.debug) 
			path += this.slash + "debug";
		else
			path += this.slash + "release";
		this.createDirectory(path);
		var platform = this.platform;
		if ((platform == "mac") || (platform == "win") || (platform == "lin")) {
			path += this.slash + "mc";
			this.createDirectory(path);
		}
		path += this.slash + last;
		this.createDirectory(path);
		return path;
	}
	run() {
		super.run();
		if ("URL" in this.config)
			this.environment.URL = this.config.URL;

		if (this.manifest.config) {
			const commandLine = this.config;
			this.config = {...this.manifest.config};
			this.mergeProperties(this.config, commandLine);
		}

		this.creation = null;
		this.defines = null;
		this.preloads = null;
		this.recipes = null;
		this.strip = null;

		if (this.rotation === undefined)
			this.rotation = 0;
		if (this.format === "UNDEFINED")
			this.format = "rgb565le";

		var name = this.environment.NAME
		this.binPath = this.createDirectories(this.outputPath, "bin", name);
		this.tmpPath = this.createDirectories(this.outputPath, "tmp", name);
		
		var path = this.tmpPath + this.slash + "files";
		this.dataPath = this.modulesPath = this.resourcesPath = path;
		this.createDirectory(path);
		for (var folder of this.dataFolders)
			this.createDirectory(path + this.slash + folder);
		for (var folder of this.jsFolders)
			this.createDirectory(path + this.slash + folder);
		for (var folder of this.resourcesFolders)
			this.createDirectory(path + this.slash + folder);
		
		var file;
		if (this.format) {
			var target = "check.xsb";
			if (!this.jsFiles.find(file => file.target == target)) {
				var source = this.tmpPath + this.slash + "check.js";
				file = new CheckFile(source, this);
				file.generate(this);
				this.jsFiles.push({ source, target });
			}

			if (this.config) {
				this.createDirectory(this.modulesPath + this.slash + "mod");
				let source = this.tmpPath + this.slash + "mod.config.js";
				file = new ConfigFile(source, this);
				file.generate(this);
				this.jsFiles.push({ source, target: "mod" + this.slash + "config.xsb" });
			}

			if (this.fragmentPath) {
				file = new FormatFile(this.tmpPath + this.slash + "mc.format.h", this);
				file.generate(this);
				file = new RotationFile(this.tmpPath + this.slash + "mc.rotation.h", this);
				file.generate(this);
			}
		}
		
		if (this.fragmentPath) {
			var path = this.tmpPath + this.slash + "makefile";
			file = new MakeFile(path);
			file.generate(this);
			if (this.make) {
				if (this.windows)
					this.then("nmake", "/nologo", "/f", path);
				else
					this.then("make", "-f", path);
			}
		}
		else {
			var path = this.tmpPath + this.slash + "make.json";
			file = new ToDoFile(path);
			file.generate(this);
		}
	}
}

		
		
