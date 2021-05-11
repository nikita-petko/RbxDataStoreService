// Channel 1: Non-chatty / important events (Game started, loaded UI script) -- more permanent messages
// Channel 2: Per frame data
// Channel 3-7: User defined / used for debugging / more temporary

// Refactor, Refator, Refactor!!

import fs from 'fs';
import { ClientSettings } from './ClientSettingsTool';
const FFLags = ClientSettings.GetFFlags();

export const cache = {
	DFLog: new Map<string, number>(),
	DFFlag: new Map<string, boolean>(),
	DFInt: new Map<string, number>(),
	DFString: new Map<string, string>(),
} as const;

//////////////////////////////////////////////////////////////////
// FastLog
//////////////////////////////////////////////////////////////////

/**
 * Contains static FastLog variables.
 */
export const FLog: Record<string, number> = {};

/**
 * A function that refetches the value of the named FastLog variable in {name} and returns it.
 * @param {string} name The name of the FastLog variable.
 * @returns {number} Returns a number that can be used in the FastLogLibrary.
 */
export const DFLog = function (name: string): number {
	const df = ClientSettings.GetDFLogs();
	if (df) {
		new Map<string, number>(Object.entries(df)).forEach((value, key) => {
			cache.DFLog[key] = value;
		});
	} else {
		return cache[name] || 0;
	}
	return df[name] || cache.DFLog[name] || 0;
};

/**
 * Contains server sided FastLog variables.
 */
export const SFLog: Record<string, number> = {};

//////////////////////////////////////////////////////////////////
// FastFlag
//////////////////////////////////////////////////////////////////

/**
 * Contains static FastFlag variables.
 */
export const FFlag: Record<string, boolean> = {};

/**
 * A function that refetches the value of the named FastFlag variable in {name} and returns it.
 * @param {string} name The name of the FastFlag variable.
 * @returns {boolean} Returns a boolean that can be used in the code base to enable certain features.
 */
export const DFFlag = function (name: string): boolean {
	const df = ClientSettings.GetDFFlags();
	if (df) {
		new Map<string, boolean>(Object.entries(df)).forEach((value, key) => {
			cache.DFFlag[key] = value;
		});
	} else {
		return cache[name] || false;
	}
	return df[name] || cache.DFFlag[name] || false;
};

/**
 * Contains server sided FastFlag variables.
 */
export const SFFlag: Record<string, boolean> = {};

//////////////////////////////////////////////////////////////////
// FastInt or FastNumber
//////////////////////////////////////////////////////////////////

/**
 * Contains static FastInt/FastNumber variables.
 */
export const FInt: Record<string, number> = {};

/**
 * A function that refetches the value of the named FastInt/FastNumber variable in {name} and returns it.
 * @param {string} name The name of the FastInt/FastNumber variable.
 * @returns {number} Returns a number that can be used in the code base to change certain features.
 */
export const DFInt = function (name: string): number {
	const df = ClientSettings.GetDFInts();
	if (df) {
		new Map<string, number>(Object.entries(df)).forEach((value, key) => {
			cache.DFInt[key] = value;
		});
	} else {
		return cache[name] || 0;
	}
	return df[name] || cache.DFInt[name] || 0;
};

/**
 * Contains server sided FastInt/FastNumber variables.
 */
export const SFInt: Record<string, number> = {};

//////////////////////////////////////////////////////////////////
// FastString
//////////////////////////////////////////////////////////////////

/**
 * Contains static FastString variables.
 */
export const FString: Record<string, string> = {};

/**
 * A function that refetches the value of the named FastString variable in {name} and returns it.
 * @param {string} name The name of the FastString variable.
 * @returns {boolean} Returns a string that can be used in the code base to change certain features.
 */
export const DFString = function (name: string): string {
	const df = ClientSettings.GetDFStrings();
	if (df) {
		new Map<string, string>(Object.entries(df)).forEach((value, key) => {
			cache.DFString[key] = value;
		});
	} else {
		return cache[name] || null;
	}
	return df[name] || cache.DFString[name] || null;
};

/**
 * Contains server sided FastString variables.
 */
export const SFString: Record<string, string> = {};

//////////////////////////////////////////////////////////////////
// Misc
//////////////////////////////////////////////////////////////////

/**
 * An array of strings that contain ClientPackNames.
 */
export const FSettings: Array<string> = [];

/**
 * Used to enable certain features.
 * @internal This is internal.
 */

export const d = {
	setup: false,
};

/**
 * Mimics the C++ function sprintf_s.
 * @param {...string[]} args The arguments to include, normally the 1st is the string to modify.
 * @returns {string} Returns a formatted string.
 * @internal This is internal.
 */
const parameterizedString = (...args: string[]): string => {
	const string = args[0];
	let i = 1;
	return string.replace(/%((%)|s|d|f|lf|i|x|X|u)/g, function (m: any) {
		// m is the matched format, e.g. %s, %d
		let val = null;
		if (m[2]) {
			val = m[2];
		} else {
			val = args[i];
			if (val !== null) {
				// A switch statement so that the formatter can be extended. Default is %s
				switch (m) {
					case '%d' || '%f' || '%lf':
						val = parseFloat(val);
						if (isNaN(val)) {
							val = 0;
						}
						break;
					case '%i' || '%u':
						val = parseInt(val);
						if (isNaN(val)) {
							val = 0;
						}
						break;
					case '%x':
						val = val.toString(16).toLowerCase();
						break;
					case '%X':
						val = val.toString(16).toUpperCase();
						break;
				}
			}
			i++;
		}
		return val;
	});
};

/**
 * Sets up FLog initially.
 * @internal This is internal.
 */
function setUpFLog() {
	const f = ClientSettings.GetFLogs();
	const df = ClientSettings.GetDFLogs();
	const sf = ClientSettings.GetSFLogs();
	const ff = ClientSettings.GetFFlags();
	const dff = ClientSettings.GetDFFlags();
	const sff = ClientSettings.GetSFFlags();
	const fi = ClientSettings.GetFInts();
	const dfi = ClientSettings.GetDFInts();
	const sfi = ClientSettings.GetSFInts();
	const fs = ClientSettings.GetFStrings();
	const dfs = ClientSettings.GetDFStrings();
	const sfs = ClientSettings.GetSFStrings();
	const fss = ClientSettings.GetFSettings();

	if (f) {
		new Map<string, number>(Object.entries(f)).forEach((value, key) => {
			FLog[key] = value;
		});
	}
	if (df) {
		new Map<string, number>(Object.entries(df)).forEach((value, key) => {
			cache.DFLog[key] = value;
		});
	}
	if (sf) {
		new Map<string, number>(Object.entries(sf)).forEach((value, key) => {
			SFLog[key] = value;
		});
	}

	if (ff) {
		new Map<string, boolean>(Object.entries(ff)).forEach((value, key) => {
			FFlag[key] = value;
		});
	}
	if (dff) {
		new Map<string, boolean>(Object.entries(dff)).forEach((value, key) => {
			cache.DFFlag[key] = value;
		});
	}
	if (sff) {
		new Map<string, boolean>(Object.entries(sff)).forEach((value, key) => {
			SFFlag[key] = value;
		});
	}

	if (fi) {
		new Map<string, number>(Object.entries(fi)).forEach((value, key) => {
			FInt[key] = value;
		});
	}
	if (dfi) {
		new Map<string, number>(Object.entries(dfi)).forEach((value, key) => {
			cache.DFInt[key] = value;
		});
	}
	if (sfi) {
		new Map<string, number>(Object.entries(sfi)).forEach((value, key) => {
			SFInt[key] = value;
		});
	}

	if (fs) {
		new Map<string, string>(Object.entries(fs)).forEach((value, key) => {
			FString[key] = value;
		});
	}
	if (dfs) {
		new Map<string, string>(Object.entries(dfs)).forEach((value, key) => {
			cache.DFString[key] = value;
		});
	}
	if (sfs) {
		new Map<string, string>(Object.entries(sfs)).forEach((value, key) => {
			SFString[key] = value;
		});
	}

	if (fss) {
		(<string[]>fss).forEach((element) => {
			FSettings.push(element);
		});
	}
	d.setup = true;
}

function printMessage(
	level: number,
	threadId: number,
	timeStamp: string,
	message: string,
	arg0: any,
	arg1: any,
	arg2: any,
	arg3: any,
	arg4: any,
) {
	if (FFLags['FastLogEnabled']) {
		if (!fs.existsSync(__dirname + '\\..\\..\\logs')) fs.mkdirSync(__dirname + '\\..\\..\\logs');
		const formatted = parameterizedString(message, arg0, arg1, arg2, arg3, arg4);
		const out = `${timeStamp},${process.uptime().toPrecision(6)},${threadId.toString(16)},${
			Math.floor(level) || 1
		} ${formatted}`;
		console.log(out);
		if (FFLags['LogToFile'])
			fs.appendFileSync(
				__dirname + `\\..\\..\\logs\\${FFLags['UseOneLog'] ? 'main' : process.pid.toString(16)}-log.log`,
				`${out}\n`,
				{
					encoding: 'utf-8',
				},
			);
	}
}
/**
 * A function that checks the LogLevel to be greater than 5.
 * @param {number} level The FastLog level.
 * @param {string} message The message to formatted and logged.
 * @param {any} arg0 Arg0
 * @param {any} arg1 Arg1
 * @param {any} arg2 Arg2
 * @param {any} arg3 Arg3
 * @param {any} arg4 Arg4
 * @returns {void} Returns nothing.
 * @internal This is internal.
 */
function FastLog(level: number, message: string, arg0: any, arg1: any, arg2: any, arg3: any, arg4: any): void {
	if (level > 5) {
		printMessage(level, process.pid, new Date(Date.now()).toISOString(), message, arg0, arg1, arg2, arg3, arg4);
	}
}

/**
 * FastLogs a message with no params.
 * @param {number} group The FastLog level.
 * @param {string} message The message to log.
 * @returns {void} Returns nothing.
 */
export const FASTLOG = (group: number, message: string): void => {
	do {
		if (group) FastLog(group, message, null, null, null, null, null);
	} while (0);
};

/**
 * FastLogs a message with 1 param of any type.
 * @param {number} group The FastLog level.
 * @param {string} message The message to log.
 * @param {any} arg0 Arg0
 * @returns {void} Returns nothing.
 */
export const FASTLOG1 = (group: number, message: string, arg0: any): void => {
	do {
		if (group) FastLog(group, message, arg0, null, null, null, null);
	} while (0);
};

/**
 * FastLogs a message with 2 params of any type.
 * @param {number} group The FastLog level.
 * @param {string} message The message to log.
 * @param {any} arg0 Arg0
 * @param {any} arg1 Arg1
 * @returns {void} Returns nothing.
 */
export const FASTLOG2 = (group: number, message: string, arg0: any, arg1: any): void => {
	do {
		if (group) FastLog(group, message, arg0, arg1, null, null, null);
	} while (0);
};

/**
 * FastLogs a message with 3 params of any type.
 * @param {number} group The FastLog level.
 * @param {string} message The message to log.
 * @param {any} arg0 Arg0
 * @param {any} arg1 Arg1
 * @param {any} arg2 Arg2
 * @returns {void} Returns nothing.
 */
export const FASTLOG3 = (group: number, message: string, arg0: any, arg1: any, arg2: any): void => {
	do {
		if (group) FastLog(group, message, arg0, arg1, arg2, null, null);
	} while (0);
};

/**
 * FastLogs a message with 4 params of any type.
 * @param {number} group The FastLog level.
 * @param {string} message The message to log.
 * @param {any} arg0 Arg0
 * @param {any} arg1 Arg1
 * @param {any} arg2 Arg2
 * @param {any} arg3 Arg3
 * @returns {void} Returns nothing.
 */
export const FASTLOG4 = (group: number, message: string, arg0: any, arg1: any, arg2: any, arg3: any): void => {
	do {
		if (group) FastLog(group, message, arg0, arg1, arg2, arg3, null);
	} while (0);
};

/**
 * FastLogs a message with 5 params of any type.
 * @param {number} group The FastLog level.
 * @param {string} message The message to log.
 * @param {any} arg0 Arg0
 * @param {any} arg1 Arg1
 * @param {any} arg2 Arg2
 * @param {any} arg3 Arg3
 * @param {any} arg4 Arg4
 * @returns {void} Returns nothing.
 */
export const FASTLOG5 = (
	group: number,
	message: string,
	arg0: any,
	arg1: any,
	arg2: any,
	arg3: any,
	arg4: any,
): void => {
	do {
		if (group) FastLog(group, message, arg0, arg1, arg2, arg3, arg4);
	} while (0);
};

/**
 * FastLogs a message with 1 string param.
 * @param {number} group The FastLog level.
 * @param {string} message The message to log.
 * @param {string} sarg The string argument to use.
 * @returns {void} Returns nothing.
 */
export const FASTLOGS = (group: number, message: string, sarg: string): void => {
	do {
		if (group) FastLog(group, message, sarg, null, null, null, null);
	} while (0);
};

/**
 * FastLogs a message with 1 param of number.
 * @param {number} group The FastLog level.
 * @param {string} message The message to log.
 * @param {number} arg0 Arg0
 * @returns {void} Returns nothing.
 */
export const FASTLOG1F = (group: number, message: string, arg0: number) => {
	do {
		if (group) FastLog(group, message, arg0, null, null, null, null);
	} while (0);
};

/**
 * FastLogs a message with 2 params of number.
 * @param {number} group The FastLog level.
 * @param {string} message The message to log.
 * @param {number} arg0 Arg0
 * @param {number} arg1 Arg1
 * @returns {void} Returns nothing.
 */
export const FASTLOG2F = (group: number, message: string, arg0: number, arg1: number): void => {
	do {
		if (group) FastLog(group, message, arg0, arg1, null, null, null);
	} while (0);
};

/**
 * FastLogs a message with 3 params of number.
 * @param {number} group The FastLog level.
 * @param {string} message The message to log.
 * @param {number} arg0 Arg0
 * @param {number} arg1 Arg1
 * @param {number} arg2 Arg2
 * @returns {void} Returns nothing.
 */
export const FASTLOG3F = (group: number, message: string, arg0: number, arg1: number, arg2: number): void => {
	do {
		if (group) FastLog(group, message, arg0, arg1, arg2, null, null);
	} while (0);
};

/**
 * FastLogs a message with 4 params of number.
 * @param {number} group The FastLog level.
 * @param {string} message The message to log.
 * @param {number} arg0 Arg0
 * @param {number} arg1 Arg1
 * @param {number} arg2 Arg2
 * @param {number} arg3 Arg3
 * @returns {void} Returns nothing.
 */
export const FASTLOG4F = (
	group: number,
	message: string,
	arg0: number,
	arg1: number,
	arg2: number,
	arg3: number,
): void => {
	do {
		if (group) FastLog(group, message, arg0, arg1, arg2, arg3, null);
	} while (0);
};

/**
 * FastLogs a message with no filter.
 * @param {number} group The FastLog level.
 * @param {string} message The message to log.
 * @returns {void} Returns nothing.
 */
export const FASTLOGNOFILTER = (group: number, message: string): void => {
	FastLog(group, message, null, null, null, null, null);
};

/**
 * FastLogs a message with no filter with 2 params of any type.
 * @param {number} group The FastLog level.
 * @param {string} message The message to log.
 * @param {any} arg0 Arg0
 * @param {any} arg1 Arg1
 * @returns {void} Returns nothing.
 */
export const FASTLOGNOFILTER2 = (group: number, message: string, arg0: any, arg1: any) => {
	FastLog(group, message, arg0, arg1, null, null, null);
};

/**
 * References the given groupName.
 * @param {string} group The name of the group to reference.
 */
export const LOGGROUP = (group: string) => {
	if (!d.setup) {
		setUpFLog();
	}
	if (FLog[group] === undefined) FLog[group] = 0;
};

/**
 * Sets the deault valur or gets the current value.
 * @param {string} group The name of the group to create.
 * @param {number} defaulton The value to set the group by,
 */
export const LOGVARIABLE = (group: string, defaulton: number) => {
	if (!d.setup) {
		setUpFLog();
	}
	FLog[group] = FLog[group] || defaulton;
};

/**
 * References the given groupName.
 * @param {string} group The name of the group to reference.
 */
export const DYNAMIC_LOGGROUP = (group: string) => {
	if (!d.setup) {
		setUpFLog();
	}
	if (cache.DFLog[group] === undefined) cache.DFLog[group] = 0;
};

/**
 * Sets the deault valur or gets the current value.
 * @param {string} group The name of the group to create.
 * @param {number} defaulton The value to set the group by,
 */
export const DYNAMIC_LOGVARIABLE = (group: string, defaulton: number) => {
	if (!d.setup) {
		setUpFLog();
	}
	cache.DFLog[group] = cache.DFLog[group] || defaulton;
};

/**
 * References the given groupName.
 * @param {string} group The name of the group to reference.
 */
export const SYNCHRONIZED_LOGGROUP = (group: string) => {
	if (!d.setup) {
		setUpFLog();
	}
	if (SFLog[group] === undefined) SFLog[group] = 0;
};

/**
 * Sets the deault valur or gets the current value.
 * @param {string} group The name of the group to create.
 * @param {number} defaulton The value to set the group by,
 */
export const SYNCHRONIZED_LOGVARIABLE = (group: string, defaulton: number) => {
	if (!d.setup) {
		setUpFLog();
	}
	SFLog[group] = SFLog[group] || defaulton;
};

export const FASTFLAG = (v: string) => {
	if (!d.setup) {
		setUpFLog();
	}
	if (FFlag[v] === undefined) FFlag[v] = false;
};
export const FASTFLAGVARIABLE = (v: string, defaulton: boolean) => {
	if (!d.setup) {
		setUpFLog();
	}
	FFlag[v] = FFlag[v] || defaulton;
};

export const DYNAMIC_FASTFLAG = (v: string) => {
	if (!d.setup) {
		setUpFLog();
	}
	if (cache.DFFlag[v] === undefined) cache.DFFlag[v] = false;
};
export const DYNAMIC_FASTFLAGVARIABLE = (v: string, defaulton: boolean) => {
	if (!d.setup) {
		setUpFLog();
	}
	cache.DFFlag[v] = cache.DFFlag[v] || defaulton;
};

export const SYNCHRONIZED_FASTFLAG = (v: string) => {
	if (!d.setup) {
		setUpFLog();
	}
	if (SFFlag[v] === undefined) SFFlag[v] = false;
};
export const SYNCHRONIZED_FASTFLAGVARIABLE = (v: string, defaulton: boolean) => {
	if (!d.setup) {
		setUpFLog();
	}
	SFFlag[v] = SFFlag[v] || defaulton;
};

export const FASTINT = (v: string) => {
	if (!d.setup) {
		setUpFLog();
	}
	if (FInt[v] === undefined) FInt[v] = 0;
};
export const FASTINTVARIABLE = (v: string, defaulton: number) => {
	if (!d.setup) {
		setUpFLog();
	}
	FInt[v] = FInt[v] || defaulton;
};

export const DYNAMIC_FASTINT = (v: string) => {
	if (!d.setup) {
		setUpFLog();
	}
	if (cache.DFInt[v] === undefined) cache.DFInt[v] = 0;
};
export const DYNAMIC_FASTINTVARIABLE = (v: string, defaulton: number) => {
	if (!d.setup) {
		setUpFLog();
	}
	cache.DFInt[v] = cache.DFInt[v] || defaulton;
};

export const SYNCHRONIZED_FASTINT = (v: string) => {
	if (!d.setup) {
		setUpFLog();
	}
	if (SFInt[v] === undefined) SFInt[v] = 0;
};
export const SYNCHRONIZED_FASTINTVARIABLE = (v: string, defaulton: number) => {
	if (!d.setup) {
		setUpFLog();
	}
	SFInt[v] = SFInt[v] || defaulton;
};

export const FASTSTRING = (v: string) => {
	if (!d.setup) {
		setUpFLog();
	}
	if (FString[v] === undefined) FString[v] = '';
};
export const FASTSTRINGVARIABLE = (v: string, defaulton: string) => {
	if (!d.setup) {
		setUpFLog();
	}
	FString[v] = FString[v] || defaulton;
};

export const DYNAMIC_FASTSTRING = (v: string) => {
	if (!d.setup) {
		setUpFLog();
	}
	if (cache.DFString[v] === undefined) cache.DFString[v] = '';
};
export const DYNAMIC_FASTSTRINGVARIABLE = (v: string, defaulton: string) => {
	if (!d.setup) {
		setUpFLog();
	}
	cache.DFString[v] = cache.DFString[v] || defaulton;
};

export const SYNCHRONIZED_FASTSTRING = (v: string) => {
	if (!d.setup) {
		setUpFLog();
	}
	if (SFString[v] === undefined) SFString[v] = '';
};
export const SYNCHRONIZED_FASTSTRINGVARIABLE = (v: string, defaulton: string) => {
	if (!d.setup) {
		setUpFLog();
	}
	SFString[v] = SFString[v] || defaulton;
};
