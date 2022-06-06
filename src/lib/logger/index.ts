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
    File Name: logger.ts
    Description: A console and file logger.
    Written by: Nikita Petko
*/

////////////////////////////////////////////////////////////////////////////////
// Project imports
////////////////////////////////////////////////////////////////////////////////

import dirname from '../dirname';
import environment from '../environment';

////////////////////////////////////////////////////////////////////////////////
// Type imports
////////////////////////////////////////////////////////////////////////////////

import { LogLevel } from './log_level';
import { LogColor } from './log_color';
import {
  nameRegex,
  invalidLogArgs,
  invalidLogMessage,
  invalidLogMessageType,
  invalidConstructorName,
  invalidSetterBooleanValue,
  invalidSetterLogLevelType,
  invalidConstructorLogLevel,
  invalidConstructorNameType,
  invalidConstructorNameRegex,
  thisKeywordIncorrectClosure,
  invalidConstructorLogToConsole,
  invalidConstructorCutLogPrefix,
  invalidConstructorLogLevelType,
  invalidConstructorLogToFileSystem,
  setterValueCannotBeUndefinedOrNull,
  invalidConstructorLogToConsoleType,
  invalidConstructorCutLogPrefixType,
  invalidConstructorLogToFileSystemType,
} from './logger_constants';

////////////////////////////////////////////////////////////////////////////////
// Type exports
////////////////////////////////////////////////////////////////////////////////

export { LogLevel };

////////////////////////////////////////////////////////////////////////////////
// Built-in imports
////////////////////////////////////////////////////////////////////////////////

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

////////////////////////////////////////////////////////////////////////////////
// Third-party imports
////////////////////////////////////////////////////////////////////////////////

import net from '@mfdlabs/net';

Error.stackTraceLimit = Infinity;

/**
 * A simple logger class that will log to the console and to a file.
 */
export default class Logger {
  //////////////////////////////////////////////////////////////////////////////
  // Private Static Readonly Properties
  //////////////////////////////////////////////////////////////////////////////

  /* Log File Stuff */
  private static readonly _logFileBaseDirectory: string = path.join(dirname.packageDirname, 'logs');

  /* Log String Stuff */
  /**
   * @internal This is a private member.
   */
  private static readonly _localIp: string = net.getLocalIPv4();
  /**
   * @internal This is a private member.
   */
  private static readonly _hostname: string = os.hostname();
  /**
   * @internal This is a private member.
   */
  private static readonly _processId: string = process.pid.toString(16);
  /**
   * @internal This is a private member.
   */
  private static readonly _platform: string = os.platform();
  /**
   * @internal This is a private member.
   */
  private static readonly _architecture: string = os.arch();
  /**
   * @internal This is a private member.
   */
  private static readonly _nodeVersion: string = process.versions.node;
  /**
   * @internal This is a private member.
   */
  private static readonly _architectureFmt: string = `${Logger._platform}-${Logger._architecture}` as const;

  /**
   * @internal This is a private member.
   */
  private static readonly _loggers: Logger[] = [];

  //////////////////////////////////////////////////////////////////////////////
  // Private Static Properties
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @internal This is a private member.
   */
  private static _singleton: Logger = null;
  /**
   * @internal This is a private member.
   */
  private static _noopSingletonLogger: Logger = null;

  //////////////////////////////////////////////////////////////////////////////
  // Private Readonly Properties
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @internal This is a private member.
   */
  private readonly _name: string = undefined;
  /**
   * @internal This is a private member.
   */
  private readonly _fileName: string = undefined;
  /**
   * @internal This is a private member.
   */
  private readonly _fullyQualifiedLogFileName: string = undefined;
  /**
   * @internal This is a private member.
   */
  private readonly _lockedFileWriteStream: fs.WriteStream = null;

  //////////////////////////////////////////////////////////////////////////////
  // Private Properties
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @internal This is a private member.
   */
  private _logLevel: LogLevel = undefined;
  /**
   * @internal This is a private member.
   */
  private _logToConsole: boolean = true;
  /**
   * @internal This is a private member.
   */
  private _logToFileSystem: boolean = true;
  /**
   * @internal This is a private member.
   */
  private _cutLogPrefix: boolean = false;

  //////////////////////////////////////////////////////////////////////////////
  // Private Static Helper Methods
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @internal This is a private member.
   */
  private static _getFileSafeDateNowIsoString(): string {
    return new Date()
      .toISOString()
      .replace(/[^a-z0-9_-]/gi, '')
      .replace(/-/g, '');
  }

  /**
   * @internal This is a private member.
   */
  private static _getDateNowIsoString(): string {
    return new Date().toISOString();
  }

  /**
   * @internal This is a private member.
   */
  private static _getUptime(): string {
    return process.uptime().toFixed(7);
  }

  /**
   * @internal This is a private member.
   */
  private static _getColorSection(content: any): string {
    return util.format('[%s%s%s]', LogColor.BrightBlack, content, LogColor.Reset);
  }

  /**
   * @internal This is a private member.
   */
  private static _formatStackTrace(stackTrace: string): string {
    // Changes the first line from 'Error: {message}' to '{message}'
    const stackTraceLines = stackTrace.split('\n');
    stackTraceLines[0] = stackTraceLines[0].replace(/^Error: /, '');

    return stackTraceLines.join('\n');
  }

  //////////////////////////////////////////////////////////////////////////////
  // Private Helper Methods
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @internal This is a private member.
   */
  private _constructFileLoggerMessage(logLevel: LogLevel, format: string, ...args: any[]): string {
    let formattedMessage = util.format(format, ...args);

    if (logLevel === LogLevel.Trace) {
      formattedMessage = util.format('%s', Logger._formatStackTrace(new Error(formattedMessage).stack));
    }

    if (this._cutLogPrefix) {
      return util.format(
        '[%s][%s][%s][%s][%s] %s\n',
        Logger._getDateNowIsoString(),
        Logger._localIp,
        Logger._hostname,
        this._name,
        logLevel.toUpperCase(),
        formattedMessage,
      );
    }

    return util.format(
      '[%s][%s][%s][%s][%s][%s][%s][%s][%s][%s] %s\n',
      Logger._getDateNowIsoString(),
      Logger._getUptime(),
      Logger._processId,
      Logger._architectureFmt,
      Logger._nodeVersion,
      Logger._localIp,
      Logger._hostname,
      dirname.packageDirname,
      this._name,
      logLevel.toUpperCase(),
      formattedMessage,
    );
  }

  /* This method is async so it can be pushed to the task queue and not block the main one */
  /**
   * @internal This is a private member.
   */
  private async _logLocally(logLevel: LogLevel, format: string, ...args: any[]): Promise<void> {
    if (!this._logToFileSystem) return;

    this._lockedFileWriteStream.write(this._constructFileLoggerMessage(logLevel, format, ...args));
  }

  /* Color Logging (Console) */

  /**
   * @internal This is a private member.
   */
  private _getSharedColorStringPrefix() {
    if (this._cutLogPrefix) {
      return util.format(
        '%s%s%s%s',
        Logger._getColorSection(Logger._getDateNowIsoString()),
        Logger._getColorSection(Logger._localIp),
        Logger._getColorSection(Logger._hostname),
        Logger._getColorSection(this._name),
      );
    }

    return util.format(
      '%s%s%s%s%s%s%s%s%s',
      Logger._getColorSection(Logger._getDateNowIsoString()),
      Logger._getColorSection(Logger._getUptime()),
      Logger._getColorSection(Logger._processId),
      Logger._getColorSection(Logger._architectureFmt),
      Logger._getColorSection(Logger._nodeVersion),
      Logger._getColorSection(Logger._localIp),
      Logger._getColorSection(Logger._hostname),
      Logger._getColorSection(dirname.packageDirname),
      Logger._getColorSection(this._name),
    );
  }

  /**
   * @internal This is a private member.
   */
  private async _logConsole(logLevel: LogLevel, color: LogColor, format: string, ...args: any[]): Promise<void> {
    if (!this._logToConsole) return;

    let formattedMessage = util.format(format, ...args);

    if (logLevel === LogLevel.Trace) {
      formattedMessage = util.format('%s', Logger._formatStackTrace(new Error(formattedMessage).stack));
    }

    const message = util.format(
      '%s[%s%s%s] %s%s%s',
      this._getSharedColorStringPrefix(),
      color,
      logLevel.toUpperCase(),
      LogColor.Reset,
      color,
      formattedMessage,
      LogColor.Reset,
    );

    console.log(message);
  }

  /**
   * @internal This is a private member.
   */
  private _checkLogLevel(logLevelToCheck: LogLevel): boolean {
    // This is to check if the passed log level is valid
    if (Object.values(LogLevel).indexOf(this._logLevel) === -1) {
      this._logLevel = LogLevel.Info;
    }

    const values = Object.values(LogLevel);

    const actualLogLevel = values.indexOf(this._logLevel);
    const logLevelToCheckIndex = values.indexOf(logLevelToCheck);

    return actualLogLevel >= logLevelToCheckIndex;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Public Static Helper Methods
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Requests that the log file directory be cleared.
   *
   * @param {boolean} override - If true, the log file directory will be cleared regardless of environment variables.
   * @returns {void} - Nothing.
   */
  public static tryClearLocalLog(override: boolean = false): void {
    Logger.singleton.log('Try clear local log files...');

    if (environment.persistLocalLogs) {
      if (override) {
        Logger.singleton.warning('Override flag set. Clearing local log files.');
      } else {
        Logger.singleton.warning('Local log files will not be cleared because persistLocalLogs is set to true.');
        return;
      }
    }

    Logger.singleton.log('Clearing local log files...');

    for (const logger of Logger._loggers) {
      logger._lockedFileWriteStream.end();
    }

    if (fs.existsSync(Logger._logFileBaseDirectory)) {
      fs.rmSync(Logger._logFileBaseDirectory, { recursive: true, force: true });
      fs.mkdirSync(Logger._logFileBaseDirectory, { recursive: true });
    }

    for (const logger of Logger._loggers) {
      Object.defineProperty(logger, '_lockedFileWriteStream', {
        value: fs.createWriteStream(logger._fullyQualifiedLogFileName, { flags: 'a' }),
      });
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Public Constructor
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Creates a new instance of the Logger class.
   * @param {string} name - The name of the logger.
   * @param {string=} logLevel - The log level of the logger.
   * @param {boolean=} logToFileSystem - If true, the logger will log to the file system.
   * @param {boolean=} logToConsole - If true, the logger will log to the console.
   * @param {boolean=} cutLogPrefix - If true, the logger will cut the log prefix.
   * @note If you do not require a specific logger, use logger.singleton instead.
   */
  public constructor(
    name: string,
    logLevel: LogLevel = LogLevel.Info,
    logToFileSystem: boolean = true,
    logToConsole: boolean = true,
    cutLogPrefix: boolean = true,
  ) {
    if (name === undefined || name === null) {
      throw new ReferenceError(invalidConstructorName);
    }
    if (typeof name !== 'string') {
      throw new TypeError(invalidConstructorNameType);
    }
    if (!nameRegex.test(name)) {
      throw new SyntaxError(invalidConstructorNameRegex);
    }
    if (Logger._loggers.some((logger) => logger._name === name)) {
      throw new ReferenceError(`Logger with name '${name}' already exists.`);
    }

    if (logLevel === undefined || logLevel === null) {
      throw new ReferenceError(invalidConstructorLogLevel);
    }
    if (typeof logLevel !== 'string') {
      throw new TypeError(invalidConstructorLogLevelType);
    }
    logLevel = logLevel?.toLowerCase() as LogLevel;
    if (Object.values(LogLevel).indexOf(logLevel) === -1) {
      throw new TypeError(
        `Invalid log level: ${logLevel}. Valid log levels are: ${Object.values(LogLevel).join(', ')}`,
      );
    }

    if (logToFileSystem === undefined || logToFileSystem === null) {
      throw new ReferenceError(invalidConstructorLogToFileSystem);
    }
    if (typeof logToFileSystem !== 'boolean') {
      throw new TypeError(invalidConstructorLogToFileSystemType);
    }

    if (logToConsole === undefined || logToConsole === null) {
      throw new ReferenceError(invalidConstructorLogToConsole);
    }
    if (typeof logToConsole !== 'boolean') {
      throw new TypeError(invalidConstructorLogToConsoleType);
    }

    if (cutLogPrefix === undefined || cutLogPrefix === null) {
      throw new ReferenceError(invalidConstructorCutLogPrefix);
    }
    if (typeof cutLogPrefix !== 'boolean') {
      throw new TypeError(invalidConstructorCutLogPrefixType);
    }

    this._name = name;
    this._logLevel = logLevel;
    this._logToFileSystem = logToFileSystem;
    this._logToConsole = logToConsole;
    this._cutLogPrefix = cutLogPrefix;

    if (this._logToFileSystem) {
      this._fileName = util.format(
        'log_%s_%s_%s_%s.log',
        this._name,
        process.version,
        Logger._getFileSafeDateNowIsoString(),
        process.pid.toString(16).toUpperCase(),
      );
      this._fullyQualifiedLogFileName = path.join(Logger._logFileBaseDirectory, this._fileName);

      if (!fs.existsSync(Logger._logFileBaseDirectory)) {
        fs.mkdirSync(Logger._logFileBaseDirectory, { recursive: true });
      }

      this._lockedFileWriteStream = fs.createWriteStream(this._fullyQualifiedLogFileName, {
        flags: 'a',
      });
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Public Static Getters
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Gets a singleton instance of the Logger class.
   * @returns {Logger} - The singleton instance of the Logger class.
   * @note This is the recommended way to get a logger if you do not require a specific logger.
   */
  public static get singleton(): Logger {
    if (Logger._singleton === null) {
      Logger._singleton = new Logger(
        environment.loggerDefaultName,
        environment.logLevel,
        environment.logToFileSystem,
        environment.logToConsole,
        environment.loggerCutPrefix,
      );
    }

    return Logger._singleton;
  }

  /**
   * Gets a singleton instance of the Logger class that noops all logging.
   * @returns {Logger} - The singleton instance of the Logger class.
   * @note This is the recommended way to get a logger if you do not require a specific logger.
   */
  public static get noopSingleton(): Logger {
    if (Logger._noopSingletonLogger === null) {
      Logger._noopSingletonLogger = new Logger(
        environment.loggerDefaultName,
        LogLevel.None,
        false,
        false,
        environment.loggerCutPrefix,
      );
    }

    return Logger._noopSingletonLogger;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Public Getters
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Gets the name of the logger.
   * @returns {string} - The name of the logger.
   */
  public get name(): string {
    return this._name;
  }

  /**
   * Gets the log level of the logger.
   * @returns {LogLevel} - The log level of the logger.
   * @note The log level is one of the following: 'none', 'error', 'warning', 'info', 'debug', 'verbose'.
   */
  public get logLevel(): LogLevel {
    return this._logLevel;
  }

  /**
   * Gets the value that determines if this logger will log to the file system.
   * @returns {boolean} - The value that determines if this logger will log to the file system.
   */
  public get logToFileSystem(): boolean {
    return this._logToFileSystem;
  }

  /**
   * Gets the value that determines if this logger will log to the console.
   * @returns {boolean} - The value that determines if this logger will log to the console.
   */
  public get logToConsole(): boolean {
    return this._logToConsole;
  }

  /**
   * Gets the value that determines if this logger will cut the log prefix.
   * @returns {boolean} - The value that determines if this logger will cut the log prefix.
   */
  public get cutLogPrefix(): boolean {
    return this._cutLogPrefix;
  }

  /**
   * Gets the log file name.
   * @returns {string} - The log file name.
   * @note This is only useful if {@link Logger.logToFileSystem} is true.
   */
  public get fileName(): string {
    return this._fileName;
  }

  /**
   * Gets the fully qualified log file name.
   * @returns {string} - The fully qualified log file name.
   * @note This is only useful if {@link Logger.logToFileSystem} is true.
   */
  public get fullyQualifiedLogFileName(): string {
    return this._fullyQualifiedLogFileName;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Public Setters
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Sets the log level of the logger.
   * @param {LogLevel} value - The log level of the logger.
   * @note The log level is one of the following: 'none', 'error', 'warning', 'info', 'debug', 'verbose'.
   * @throws {ReferenceError} - Value cannot be null or undefined.
   * @throws {TypeError} - Value supplied must of type string or LogLevel.
   * @throws {TypeError} - Value supplied must be one of the following: 'none', 'error', 'warning', 'info', 'debug', 'verbose'.
   */
  public set logLevel(value: LogLevel) {
    if (value === undefined || value === null) {
      throw new ReferenceError(setterValueCannotBeUndefinedOrNull);
    }
    if (typeof value !== 'string') {
      throw new TypeError(invalidSetterLogLevelType);
    }

    value = value?.toLowerCase() as LogLevel;
    if (Object.values(LogLevel).indexOf(value) === -1) {
      throw new TypeError(`Invalid log level: ${value}. Valid log levels are: ${Object.values(LogLevel).join(', ')}`);
    }

    if (this.logLevel !== value) {
      this._logLevel = value;
    }
  }

  /**
   * Sets the value that determines if this logger will log to the file system.
   * @param {boolean} value - The value that determines if this logger will log to the file system.
   * @throws {ReferenceError} - Value cannot be null or undefined.
   * @throws {TypeError} - Value supplied must of type boolean.
   */
  public set logToFileSystem(value: boolean) {
    if (value === undefined || value === null) {
      throw new ReferenceError(setterValueCannotBeUndefinedOrNull);
    }
    if (typeof value !== 'boolean') {
      throw new TypeError(invalidSetterBooleanValue);
    }

    if (this._logToFileSystem !== value) {
      this._logToFileSystem = value;
    }
  }

  /**
   * Sets the value that determines if this logger will log to the console.
   * @param {boolean} value - The value that determines if this logger will log to the console.
   * @throws {ReferenceError} - Value cannot be null or undefined.
   * @throws {TypeError} - Value supplied must of type boolean.
   */
  public set logToConsole(value: boolean) {
    if (value === undefined || value === null) {
      throw new ReferenceError(setterValueCannotBeUndefinedOrNull);
    }
    if (typeof value !== 'boolean') {
      throw new TypeError(invalidSetterBooleanValue);
    }

    if (this._logToConsole !== value) {
      this._logToConsole = value;
    }
  }

  /**
   * Sets the value that determines if this logger will cut the log prefix.
   * @param {boolean} value - The value that determines if this logger will cut the log prefix.
   * @throws {ReferenceError} - Value cannot be null or undefined.
   * @throws {TypeError} - Value supplied must of type boolean.
   */
  public set cutLogPrefix(value: boolean) {
    if (value === undefined || value === null) {
      throw new ReferenceError(setterValueCannotBeUndefinedOrNull);
    }
    if (typeof value !== 'boolean') {
      throw new TypeError(invalidSetterBooleanValue);
    }

    if (this._cutLogPrefix !== value) {
      this._cutLogPrefix = value;
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Public Log Methods
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Logs a regular message.
   * @param {string} message - The message to log.
   * @param {any[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   * @throws {TypeError} - The `this` keyword is the incorrect type, if you are applying this to a callback, please call this within a lambda instead of passing the method as a callback.
   * @throws {ReferenceError} - Message cannot be null or undefined.
   * @throws {TypeError} - Message supplied must of type string or function that returns a string.
   * @throws {RangeError} - Message supplied must be at least 1 character long.
   * @throws {TypeError} - Arguments supplied must be of type Array. (Spread operator will work.)
   */
  public async log(message: string | (() => string), ...args: any[]): Promise<void> {
    if (!(this instanceof Logger)) {
      throw new TypeError(thisKeywordIncorrectClosure);
    }
    if (message === undefined || message === null) {
      throw new ReferenceError(invalidLogMessage);
    }
    if (typeof message === 'function') {
      message = message();
    }
    if (typeof message !== 'string') {
      throw new TypeError(invalidLogMessageType);
    }
    if (message.length === 0) {
      throw new RangeError(invalidLogMessage);
    }
    if (args && !Array.isArray(args)) {
      throw new TypeError(invalidLogArgs);
    }

    if (!this._checkLogLevel(LogLevel.Info)) return;

    this._logConsole(LogLevel.Info, LogColor.BrightWhite, message, ...args);
    this._logLocally(LogLevel.Info, message, ...args);
  }

  /**
   * Logs a warning message.
   * @param {string} message - The message to log.
   * @param {any[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   * @throws {TypeError} - The `this` keyword is the incorrect type, if you are applying this to a callback, please call this within a lambda instead of passing the method as a callback.
   * @throws {ReferenceError} - Message cannot be null or undefined.
   * @throws {TypeError} - Message supplied must of type string or function that returns a string.
   * @throws {RangeError} - Message supplied must be at least 1 character long.
   * @throws {TypeError} - Arguments supplied must be of type Array. (Spread operator will work.)
   */
  public async warning(message: string | (() => string), ...args: any[]): Promise<void> {
    if (!(this instanceof Logger)) {
      throw new TypeError(thisKeywordIncorrectClosure);
    }
    if (message === undefined || message === null) {
      throw new ReferenceError(invalidLogMessage);
    }
    if (typeof message === 'function') {
      message = message();
    }
    if (typeof message !== 'string') {
      throw new TypeError(invalidLogMessageType);
    }
    if (message.length === 0) {
      throw new RangeError(invalidLogMessage);
    }
    if (args && !Array.isArray(args)) {
      throw new TypeError(invalidLogArgs);
    }

    if (!this._checkLogLevel(LogLevel.Warning)) return;

    this._logConsole(LogLevel.Warning, LogColor.BrightYellow, message, ...args);
    this._logLocally(LogLevel.Warning, message, ...args);
  }

  /**
   * Logs a trace message.
   * @param {string} message - The message to log.
   * @param {any[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   * @remarks This will create a trace back directly from this method, not the method that called it.
   * @throws {TypeError} - The `this` keyword is the incorrect type, if you are applying this to a callback, please call this within a lambda instead of passing the method as a callback.
   * @throws {ReferenceError} - Message cannot be null or undefined.
   * @throws {TypeError} - Message supplied must of type string or function that returns a string.
   * @throws {RangeError} - Message supplied must be at least 1 character long.
   * @throws {TypeError} - Arguments supplied must be of type Array. (Spread operator will work.)
   */
  public async trace(message: string | (() => string), ...args: any[]): Promise<void> {
    if (!(this instanceof Logger)) {
      throw new TypeError(thisKeywordIncorrectClosure);
    }
    if (message === undefined || message === null) {
      throw new ReferenceError(invalidLogMessage);
    }
    if (typeof message === 'function') {
      message = message();
    }
    if (typeof message !== 'string') {
      throw new TypeError(invalidLogMessageType);
    }
    if (message.length === 0) {
      throw new RangeError(invalidLogMessage);
    }
    if (args && !Array.isArray(args)) {
      throw new TypeError(invalidLogArgs);
    }

    if (!this._checkLogLevel(LogLevel.Trace)) return;

    this._logConsole(LogLevel.Trace, LogColor.BrightMagenta, message, ...args);
    this._logLocally(LogLevel.Trace, message, ...args);
  }

  /**
   * Logs a debug message.
   * @param {string} message - The message to log.
   * @param {any[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   * @throws {TypeError} - The `this` keyword is the incorrect type, if you are applying this to a callback, please call this within a lambda instead of passing the method as a callback.
   * @throws {ReferenceError} - Message cannot be null or undefined.
   * @throws {TypeError} - Message supplied must of type string or function that returns a string.
   * @throws {RangeError} - Message supplied must be at least 1 character long.
   * @throws {TypeError} - Arguments supplied must be of type Array. (Spread operator will work.)
   */
  public async debug(message: string | (() => string), ...args: any[]): Promise<void> {
    if (!(this instanceof Logger)) {
      throw new TypeError(thisKeywordIncorrectClosure);
    }
    if (message === undefined || message === null) {
      throw new ReferenceError(invalidLogMessage);
    }
    if (typeof message === 'function') {
      message = message();
    }
    if (typeof message !== 'string') {
      throw new TypeError(invalidLogMessageType);
    }
    if (message.length === 0) {
      throw new RangeError(invalidLogMessage);
    }
    if (args && !Array.isArray(args)) {
      throw new TypeError(invalidLogArgs);
    }

    if (!this._checkLogLevel(LogLevel.Debug)) return;

    this._logConsole(LogLevel.Debug, LogColor.BrightMagenta, message, ...args);
    this._logLocally(LogLevel.Debug, message, ...args);
  }

  /**
   * Logs an info message.
   * @param {string} message - The message to log.
   * @param {any[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   * @throws {TypeError} - The `this` keyword is the incorrect type, if you are applying this to a callback, please call this within a lambda instead of passing the method as a callback.
   * @throws {ReferenceError} - Message cannot be null or undefined.
   * @throws {TypeError} - Message supplied must of type string or function that returns a string.
   * @throws {RangeError} - Message supplied must be at least 1 character long.
   * @throws {TypeError} - Arguments supplied must be of type Array. (Spread operator will work.)
   */
  public async information(message: string | (() => string), ...args: any[]): Promise<void> {
    if (!(this instanceof Logger)) {
      throw new TypeError(thisKeywordIncorrectClosure);
    }
    if (message === undefined || message === null) {
      throw new ReferenceError(invalidLogMessage);
    }
    if (typeof message === 'function') {
      message = message();
    }
    if (typeof message !== 'string') {
      throw new TypeError(invalidLogMessageType);
    }
    if (message.length === 0) {
      throw new RangeError(invalidLogMessage);
    }
    if (args && !Array.isArray(args)) {
      throw new TypeError(invalidLogArgs);
    }

    if (!this._checkLogLevel(LogLevel.Info)) return;

    this._logConsole(LogLevel.Info, LogColor.BrightBlue, message, ...args);
    this._logLocally(LogLevel.Info, message, ...args);
  }

  /**
   * Logs an error message.
   * @param {string} message - The message to log.
   * @param {any[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   * @throws {TypeError} - The `this` keyword is the incorrect type, if you are applying this to a callback, please call this within a lambda instead of passing the method as a callback.
   * @throws {ReferenceError} - Message cannot be null or undefined.
   * @throws {TypeError} - Message supplied must of type string or function that returns a string.
   * @throws {RangeError} - Message supplied must be at least 1 character long.
   * @throws {TypeError} - Arguments supplied must be of type Array. (Spread operator will work.)
   */
  public async error(message: string | (() => string), ...args: any[]): Promise<void> {
    if (!(this instanceof Logger)) {
      throw new TypeError(thisKeywordIncorrectClosure);
    }
    if (message === undefined || message === null) {
      throw new ReferenceError(invalidLogMessage);
    }
    if (typeof message === 'function') {
      message = message();
    }
    if (typeof message !== 'string') {
      throw new TypeError(invalidLogMessageType);
    }
    if (message.length === 0) {
      throw new RangeError(invalidLogMessage);
    }
    if (args && !Array.isArray(args)) {
      throw new TypeError(invalidLogArgs);
    }

    if (!this._checkLogLevel(LogLevel.Error)) return;

    this._logConsole(LogLevel.Error, LogColor.BrightRed, message, ...args);
    this._logLocally(LogLevel.Error, message, ...args);
  }
}
