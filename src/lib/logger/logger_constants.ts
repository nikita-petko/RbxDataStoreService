/*
   Copyright 2022 Nikita Petko <petko@vmminfra.net>

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

/*
	File Name: logger_constants.ts
	Description: Constants for the logger.
	Written by: Nikita Petko
*/

/**
 * This is an error message for when you reference a method in callback form like this:
 * @example ```typescript
 *
 * const logger = new Logger();
 *
 * someClass.setLogFunction(logger.log);
 *
 * ```
 *
 * Instead of this:
 * @example ```typescript
 *
 * const logger = new Logger();
 *
 * someClass.setLogFunction(logger.log.bind(logger));
 * // or
 * someClass.setLogFunction((fmt, ...args) => logger.log(fmt, ...args));
 *
 * ```
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const thisKeywordIncorrectClosure: string =
  'The `this` keyword is the incorrect type, if you are applying this to a callback, please call this within a lambda instead of passing the method as a callback.' as const;

/**
 * This is an error message for when you supply a undefined, null, or empty string to a logger method.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const invalidLogMessage: string = 'The `message` argument cannot be undefined, null, or empty.' as const;

/**
 * This is an error message for when you supply a message that is not a string or a function.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const invalidLogMessageType: string =
  'The `message` argument must be a string or a function that returns a string.' as const;

/**
 * This is an error message for when the value you supply for a setter is undefined or null.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const setterValueCannotBeUndefinedOrNull: string = 'The `value` argument cannot be undefined or null.' as const;

/**
 * This is an error message for when you supply a value to setLogerLevel that is not a string or LogLevel.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const invalidSetterLogLevelType: string = 'The `value` argument must be a string or a LogLevel.' as const;

/**
 * This is an error message for when you supply a value to a boolean setter that is not a boolean.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const invalidSetterBooleanValue: string = 'The `value` argument must be a boolean.' as const;

/**
 * This is an error message for when you supply a null or undefined name to the constructor.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const invalidConstructorName: string = 'The `name` argument cannot be undefined or null.' as const;

/**
 * This is an error message for when you supply a name to the constructor that is not a string.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const invalidConstructorNameType: string = 'The `name` argument must be a string.' as const;

/**
 * This is the regex used to validate a name.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {RegExp} The regex.
 */
export const nameRegex: RegExp = /^[a-zA-Z0-9_\-]{1,25}$/;

/**
 * This is an error message for when you supply a name to the constructor that is empty.
 * 
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const invalidConstructorNameEmpty: string = 'The `name` argument cannot be empty.' as const;

/**
 * This is an error message for when you supply a name to the constructor that does not match the regex /^[a-zA-Z0-9_\-]{1,15}$/.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const invalidConstructorNameRegex: string =
  'Invalid logger name. Logger names can only be 25 characters long, and can only contain letters, numbers, underscores, and dashes.' as const;

/**
 * This is an error message for when you supply a null or undefined log level to the constructor.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const invalidConstructorLogLevel: string = 'The `logLevel` argument cannot be undefined or null.' as const;

/**
 * This is an error message for when you supply a log level to the constructor that is not a string or LogLevel.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const invalidConstructorLogLevelType: string =
  'The `logLevel` argument must be a string or a LogLevel.' as const;

/**
 * This is an error message for when you supply a logToFileSystem value to the constructor that is undefined or null.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const invalidConstructorLogToFileSystem: string =
  'The `logToFileSystem` argument cannot be undefined or null.' as const;

/**
 * This is an error message for when you supply a logToFileSystem value to the constructor that is not a boolean.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const invalidConstructorLogToFileSystemType: string =
  'The `logToFileSystem` argument must be a boolean.' as const;

/**
 * This is an error message for when you supply a logToConsole value to the constructor that is undefined or null.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const invalidConstructorLogToConsole: string =
  'The `logToConsole` argument cannot be undefined or null.' as const;

/**
 * This is an error message for when you supply a logToConsole value to the constructor that is not a boolean.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const invalidConstructorLogToConsoleType: string = 'The `logToConsole` argument must be a boolean.' as const;

/**
 * This is an error message for when you supply a cutLogPrefix value to the constructor that is undefined or null.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const invalidConstructorCutLogPrefix: string =
  'The `cutLogPrefix` argument cannot be undefined or null.' as const;

/**
 * This is an error message for when you supply a cutLogPrefix value to the constructor that is not a boolean.
 *
 * @internal This is only ingested internally.
 * @constant
 * @type {string} The error message.
 */
export const invalidConstructorCutLogPrefixType: string = 'The `cutLogPrefix` argument must be a boolean.' as const;
