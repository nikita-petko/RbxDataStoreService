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
    File Name: logger.spec.ts
    Description: Logger Test Specification
    Written by: Nikita Petko
*/

import dirname from '../lib/dirname';
import environment from '../lib/environment';
import logger, { LogLevel } from '../lib/logger';

import * as fs from 'fs';
import * as path from 'path';
import * as events from 'events';

// Set up packageDirname for testing. It should be this file's directory.
dirname.packageDirname = path.resolve();

jest.mock('fs');
jest.mock('path');

function mock<T>(type: any, method: string, returnValue: T) {
  const mocked = jest.spyOn(type, method);

  if (typeof returnValue === 'function') {
    mocked.mockImplementation(returnValue as any);
  } else {
    mocked.mockReturnValue(returnValue);
  }
}

function endMock(type: any, method: string) {
  type[method].mockRestore();
}

function mockDefine(type: any, property: string, value: any) {
  const attr = {
    ...Object.getOwnPropertyDescriptor(type, property),
    configurable: true
  };

  if (typeof value === 'function') {
    attr.value = value;
    delete attr.get;
    delete attr.set;
  } else {
    attr.value = value;
  }

  Object.defineProperty(type, property, attr);
}

class CodeError extends Error implements NodeJS.ErrnoException {
  public errno?: number | undefined;
  public code?: string | undefined;
  public path?: string | undefined;
  public syscall?: string | undefined;

  public name = 'ErrnoException';
  public message: string = '';

  constructor(code?: string | undefined, p?: string | undefined, syscall?: string | undefined) {
    super();

    this.code = code;
    this.path = p;
    this.syscall = syscall;
  }
}

describe('Logger', () => {
  beforeAll(() => {
    process.env.LOG_LEVEL = LogLevel.Trace;

    // Make sure we mock console.log
    // mockReturn(console, 'log', undefined);
    const mockFileStream = {
      _event: new events.EventEmitter(),
      destroy: jest.fn(),
      emit: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      write: jest.fn(),
    };
    mockFileStream.on.mockImplementation((e, c) => {
      (mockFileStream as any)._event.on(e, c);
    });
    mockFileStream.emit.mockImplementation((e, ...c) => {
      (mockFileStream as any)._event.emit(e, ...c);
    });

    mockFileStream._event.setMaxListeners(Infinity);

    mock(fs, 'createWriteStream', mockFileStream);
  });

  afterEach(() => {
    logger.tryClearAllLoggers();
  });

  describe('_logFileBaseDirectory', () => {
    it('should return the _logFileBaseDirectoryBacking property', () => {
      // tslint:disable-next-line: no-string-literal
      expect(logger['_logFileBaseDirectory']).toBe(logger['_logFileBaseDirectoryBacking']);
    });

    it('should return the value of path.resolve() if path.join() throws an error', () => {
      mock(path, 'join', () => {
        throw new Error('path.join() failed');
      });
      mock(path, 'resolve', 'resolveValue');

      // tslint:disable-next-line: no-string-literal
      expect(logger['_logFileBaseDirectory']).toBe('resolveValue');

      mock(path, 'join', 'joinValue');
      endMock(path, 'resolve');
    });
  });

  describe('constructor', () => {
    it('should throw if the name is not specified', () => {
      expect(() => {
        return new logger(undefined as any);
      }).toThrow();

      expect(() => {
        return new logger(null as any);
      }).toThrow();
    });

    it('should throw if the name is not a string', () => {
      expect(() => {
        return new logger(1 as any);
      }).toThrow();

      expect(() => {
        return new logger([] as any);
      }).toThrow();
    });

    it('should throw if the name is empty', () => {
      expect(() => {
        return new logger('');
      }).toThrow();
    });

    it('should throw if the name does not match /^[a-zA-Z0-9_\\-]{1,25}$/', () => {
      expect(() => {
        return new logger('invalid name');
      }).toThrow();
    });

    it('should throw if the name is longer than 25 characters', () => {
      expect(() => {
        return new logger('a'.repeat(26));
      }).toThrow();
    });

    it('should throw if there is a logger with the same name', () => {
      // tslint:disable-next-line: no-unused-expression
      new logger('logger');

      expect(() => {
        return new logger('logger');
      }).toThrow();
    });

    it('should throw if the logLevel is null', () => {
      expect(() => {
        return new logger('logger', null as any);
      }).toThrow();
    });

    it('should throw if the logLevel is not a string or LogLevel', () => {
      expect(() => {
        return new logger('logger', 1 as any);
      }).toThrow();

      expect(() => {
        return new logger('logger', [] as any);
      }).toThrow();
    });

    it('should throw if the logLevel is not a valid LogLevel', () => {
      expect(() => {
        return new logger('logger', 'invalid log level' as LogLevel);
      }).toThrow();
    });

    it('should throw if the logToFileSystem argument is null', () => {
      expect(() => {
        return new logger('logger', LogLevel.Trace, null as any);
      }).toThrow();
    });

    it('should throw if the logToFileSystem argument is not a boolean', () => {
      expect(() => {
        return new logger('logger', LogLevel.Trace, 1 as any);
      }).toThrow();

      expect(() => {
        return new logger('logger', LogLevel.Trace, [] as any);
      }).toThrow();
    });

    it('should throw if the logToConsole argument is null', () => {
      expect(() => {
        return new logger('logger', LogLevel.Trace, false, null as any);
      }).toThrow();
    });

    it('should throw if the logToConsole argument is not a boolean', () => {
      expect(() => {
        return new logger('logger', LogLevel.Trace, false, 1 as any);
      }).toThrow();

      expect(() => {
        return new logger('logger', LogLevel.Trace, false, [] as any);
      }).toThrow();
    });

    it('should throw if the cutLogPrefix argument is null', () => {
      expect(() => {
        return new logger('logger', LogLevel.Trace, false, false, null as any);
      }).toThrow();
    });

    it('should throw if the cutLogPrefix argument is not a boolean', () => {
      expect(() => {
        return new logger('logger', LogLevel.Trace, false, false, 1 as any);
      }).toThrow();

      expect(() => {
        return new logger('logger', LogLevel.Trace, false, false, [] as any);
      }).toThrow();
    });

    it('should make the logger.logToConsole argument false if we cannot write to stdout or stderr', () => {
      mockDefine(process.stdout, 'isTTY', false);
      mockDefine(process.stderr, 'isTTY', false);

      const log = new logger('logger', LogLevel.Trace, false, true, false);

      expect(log.logToConsole).toBe(false);

      mockDefine(process.stdout, 'isTTY', true);
      mockDefine(process.stderr, 'isTTY', true);
    });

    it('should make set the fileName, fullyQualifiedLogFileName, and _lockedFileWriteStream if _logToFileSystem is true', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(log.fileName).toBeDefined();
      expect(log.fullyQualifiedLogFileName).toBeDefined();
      // tslint:disable-next-line: no-string-literal
      expect(log['_lockedFileWriteStream']).toBeDefined();
    });

    it('should rethrow an error if fs.mkdirSync throws but it is not a NodeJS.ErrnoException', () => {
      mock(fs, 'mkdirSync', () => {
        throw new Error('some error');
      });
      mock(fs, 'existsSync', () => {
        return false;
      });

      expect(() => {
        return new logger('logger', LogLevel.Trace, true, true, false);
      }).toThrow();

      endMock(fs, 'mkdirSync');

      mock(fs, 'existsSync', () => {
        return true;
      });
    });

    it('should set logger.logToFileSystem to false if we cannot create the base log directory', () => {
      mock(fs, 'mkdirSync', () => {
        throw new CodeError('EPERM');
      });
      mock(fs, 'existsSync', () => {
        return false;
      });

      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(log.logToFileSystem).toBe(false);

      mock(fs, 'mkdirSync', () => {
        throw new CodeError('EACCES');
      });

      const log2 = new logger('logger_2', LogLevel.Trace, true, true, false);

      expect(log2.logToFileSystem).toBe(false);

      endMock(fs, 'mkdirSync');
      mock(fs, 'existsSync', () => {
        return true;
      });
    });

    it('should set logger.logToFileSystem to false and call logger.warning if there was a fileStream error', (done) => {
      jest.setTimeout(10000);

      const log = new logger('logger', LogLevel.Trace, true, true, false);
      const fStream = log['_lockedFileWriteStream']; // tslint:disable-line: no-string-literal

      jest.spyOn(log, 'warning');

      fStream.emit('error', undefined); // If we emit undefined or null, it will warn regardless.
      fStream.emit('error', new CodeError('EACCES'));
      fStream.emit('error', new CodeError('EISDIR'));
      fStream.emit('error', new CodeError('EMFILE'));
      fStream.emit('error', new CodeError('ENFILE'));
      fStream.emit('error', new CodeError('ENOENT'));
      fStream.emit('error', new CodeError('ENOSPC'));
      fStream.emit('error', new CodeError('EPERM'));
      fStream.emit('error', new CodeError('EROFS'));
      fStream.emit('error', new Error('some error'));

      setTimeout(() => {
        expect(log.logToFileSystem).toBe(false);
        expect(log.warning).toHaveBeenCalled();

        done();
      }, 500);
    });
  });

  describe('get_singleton', () => {
    it('should return the singleton logger', () => {
      const singletonLogger = logger.singleton;

      expect(singletonLogger).toBeDefined();
      expect(singletonLogger).toBeInstanceOf(logger);
      expect(singletonLogger.name).toBe(environment.loggerDefaultName);
    });
  });

  describe('get_noopSingleton', () => {
    it('should return the noop singleton logger', () => {
      const noopSingletonLogger = logger.noopSingleton;

      expect(noopSingletonLogger).toBeDefined();
      expect(noopSingletonLogger).toBeInstanceOf(logger);
      expect(noopSingletonLogger.name).toBe(environment.loggerDefaultName + '_noop');
    });
  });

  describe('tryClearLocalLog', () => {
    it('should call the singleton logger.log method 2 times', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'log');
      jest.spyOn(singletonLogger, 'warning');

      logger.tryClearLocalLog();

      expect(singletonLogger.log).toHaveBeenCalledTimes(2);
    });

    it('should call the singleton logger.warning method warning about persistLocalLogs environment variable', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'warning');

      process.env.PERSIST_LOCAL_LOGS = 'true';

      logger.tryClearLocalLog();

      expect(singletonLogger.warning).toHaveBeenCalledWith(
        'Local log files will not be cleared because persistLocalLogs is set to true.',
      );

      delete process.env.PERSIST_LOCAL_LOGS;
    });

    it('should call the singleton logger.warning method warning about persistLocalLogs environment variable when the override is set', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'warning');

      process.env.PERSIST_LOCAL_LOGS = 'true';

      logger.tryClearLocalLog(true);

      expect(singletonLogger.warning).toHaveBeenCalledWith('Override flag set. Clearing local log files.');

      delete process.env.PERSIST_LOCAL_LOGS;
    });

    it('should try to remove the log base directory if it exists', () => {
      mock(fs, 'existsSync', () => {
        return true;
      });
      mock(fs, 'rmSync', () => {
        return true;
      });
      mock(fs, 'mkdirSync', () => {
        return true;
      });

      logger.tryClearLocalLog();

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.rmSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it('should reinstate logger file streams if their logToFileSystem property is true', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);
      const nonFileLog = new logger('non-file-logger', LogLevel.Trace, false, true, false);

      jest.spyOn(log, '_createFileStream' as any);
      jest.spyOn(nonFileLog, '_createFileStream' as any);

      logger.tryClearLocalLog();

      expect(log['_createFileStream']).toHaveBeenCalled(); // tslint:disable-line: no-string-literal
      expect(nonFileLog['_createFileStream']).not.toHaveBeenCalled(); // tslint:disable-line: no-string-literal
    });

    it('should call the singleton logger.error method if there was an error clearing the log directory', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'error');

      mock(fs, 'existsSync', () => {
        throw new Error('some error');
      });

      logger.tryClearLocalLog();

      expect(singletonLogger.error).toHaveBeenCalled();

      endMock(fs, 'existsSync');
    });
  });

  describe('tryClearAllLoggers', () => {
    it('should call the singleton logger.log method 1 time', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'log');

      logger.tryClearAllLoggers();

      expect(singletonLogger.log).toHaveBeenCalled();
    });

    it('should ignore the singleton logger and noop singleton logger', () => {
      const singletonLogger = logger.singleton;
      const noopSingletonLogger = logger.noopSingleton;
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      logger.tryClearAllLoggers();

      const loggers = logger['_loggers']; // tslint:disable-line: no-string-literal

      expect(loggers.has(singletonLogger.name)).toBe(true);
      expect(loggers.has(noopSingletonLogger.name)).toBe(true);
      expect(loggers.has(log.name)).toBe(false);
    });

    it('should call the singleton logger.error method if there was an error clearing the loggers', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'error');

      // tslint:disable-next-line: no-string-literal
      jest.spyOn(logger['_loggers'], 'forEach' as any).mockImplementation(() => {
        throw new Error('some error');
      });

      logger.tryClearAllLoggers();

      expect(singletonLogger.error).toHaveBeenCalled();

      // tslint:disable-next-line: no-string-literal
      endMock(logger['_loggers'], 'forEach');
    });
  });

  describe('get_name', () => {
    it('should return the name of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(log.name).toBe('logger');
    });
  });

  describe('get_logLevel', () => {
    it('should return the log level of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(log.logLevel).toBe(LogLevel.Trace);
    });
  });

  describe('get_logToFileSystem', () => {
    it('should return the logToFileSystem property of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(log.logToFileSystem).toBe(true);
    });
  });

  describe('get_logToConsole', () => {
    it('should return the logToConsole property of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(log.logToConsole).toBe(true);
    });
  });

  describe('get_cutLogPrefix', () => {
    it('should return the cutLogPrefix property of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(log.cutLogPrefix).toBe(false);
    });
  });

  describe('get_fileName', () => {
    it('should return the fileName property of the logger if the logToFileSystem property is true', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(log.fileName).toBeDefined();

      log.logToFileSystem = false;

      expect(log.fileName).toBeUndefined();
    });
  });

  describe('get_fullyQualifiedLogFileName', () => {
    it('should return the fullyQualifiedLogFileName property of the logger if the logToFileSystem property is true', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(log.fullyQualifiedLogFileName).toBeDefined();

      log.logToFileSystem = false;

      expect(log.fullyQualifiedLogFileName).toBeUndefined();
    });
  });

  describe('set_logLevel', () => {
    it('should throw if the value is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.logLevel = undefined as any;
      }).toThrow();

      expect(() => {
        log.logLevel = null as any;
      }).toThrow();

      expect(log.logLevel).toBe(LogLevel.Trace);
    });

    it('should throw if the type of the value is not a string', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.logLevel = true as any;
      }).toThrow();

      expect(() => {
        log.logLevel = 1 as any;
      }).toThrow();

      expect(log.logLevel).toBe(LogLevel.Trace);
    });

    it('should throw if the value is not a valid log level', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.logLevel = 'invalid' as any;
      }).toThrow();

      expect(log.logLevel).toBe(LogLevel.Trace);
    });

    it('should set the log level of the logger if it is not the same as the current log level', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      log.logLevel = LogLevel.Info;

      expect(log.logLevel).toBe(LogLevel.Info);
    });
  });

  describe('set_logToFileSystem', () => {
    it('should throw if the value is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.logToFileSystem = undefined as any;
      }).toThrow();

      expect(() => {
        log.logToFileSystem = null as any;
      }).toThrow();

      expect(log.logToFileSystem).toBe(true);
    });

    it('should throw if the type of the value is not a boolean', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.logToFileSystem = 'true' as any;
      }).toThrow();

      expect(() => {
        log.logToFileSystem = 1 as any;
      }).toThrow();

      expect(log.logToFileSystem).toBe(true);
    });

    it('should set the logToFileSystem property of the logger if it is not the same as the current logToFileSystem property', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      log.logToFileSystem = false;

      expect(log.logToFileSystem).toBe(false);
    });

    it('should call logger._closeFileStream if the logToFileSystem property is set to false', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      jest.spyOn(log, '_closeFileStream' as any);

      log.logToFileSystem = false;

      expect(log['_closeFileStream']).toHaveBeenCalled(); // tslint:disable-line: no-string-literal
    });

    it('should call logger._createFileName and logger._createFileStream if the logToFileSystem property is set to true', () => {
      const log = new logger('logger', LogLevel.Trace, false, true, false);

      jest.spyOn(log, '_createFileName' as any);
      jest.spyOn(log, '_createFileStream' as any);

      log.logToFileSystem = true;

      expect(log['_createFileName']).toHaveBeenCalled(); // tslint:disable-line: no-string-literal
      expect(log['_createFileStream']).toHaveBeenCalled(); // tslint:disable-line: no-string-literal
    });
  });

  describe('set_logToConsole', () => {
    it('should throw if the value is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.logToConsole = undefined as any;
      }).toThrow();

      expect(() => {
        log.logToConsole = null as any;
      }).toThrow();

      expect(log.logToConsole).toBe(true);
    });

    it('should throw if the type of the value is not a boolean', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.logToConsole = 'true' as any;
      }).toThrow();

      expect(() => {
        log.logToConsole = 1 as any;
      }).toThrow();

      expect(log.logToConsole).toBe(true);
    });

    it('should set the logToConsole property of the logger if it is not the same as the current logToConsole property', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      log.logToConsole = false;

      expect(log.logToConsole).toBe(false);
    });
  });

  describe('set_cutLogPrefix', () => {
    it('should throw if the value is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.cutLogPrefix = undefined as any;
      }).toThrow();

      expect(() => {
        log.cutLogPrefix = null as any;
      }).toThrow();

      expect(log.cutLogPrefix).toBe(false);
    });

    it('should throw if the type of the value is not a boolean', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.cutLogPrefix = 'true' as any;
      }).toThrow();

      expect(() => {
        log.cutLogPrefix = 1 as any;
      }).toThrow();

      expect(log.cutLogPrefix).toBe(false);
    });

    it('should set the cutLogPrefix property of the logger if it is not the same as the current cutLogPrefix property', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      log.cutLogPrefix = true;

      expect(log.cutLogPrefix).toBe(true);
    });
  });

  describe('log', () => {
    it('should throw if the instance type is not an instanceof logger', (done) => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      function callback(logFunc: (msg: string) => Promise<void>) {
        expect(async () => {
          await logFunc('message');
        }).rejects.toThrow();

        done();
      }

      callback(log.log);
    });

    it('should throw if the message is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.log(undefined as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.log(null as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is not a string or function', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.log(1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.log(true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is a function and the function returns a value that is not a string', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.log(() => 1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.log(() => true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is empty', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.log('');
      }).rejects.toThrow();
    });

    it('should log the message to the console', async () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      jest.spyOn(log, 'log');

      await log.log('message');

      log.cutLogPrefix = false;

      await log.log('message');

      expect(log.log).toHaveBeenCalledWith('message');

      log.cutLogPrefix = true;

      // log with arguments
      await log.log('message', 1, 2, 3);

      log.cutLogPrefix = false;

      await log.log(() => 'message');

      await log.log('message', 1, 2, 3);

      expect(log.log).toHaveBeenCalledWith('message', 1, 2, 3);

      log.logToConsole = false;

      jest.spyOn(console, 'log');

      await log.log('message');

      expect(console.log).not.toHaveBeenCalled();

      log.logLevel = LogLevel.None;

      await log.log('message');

      expect(console.log).not.toHaveBeenCalled();

      // Stop spying on console.log
      (console.log as any).mockRestore();
      (log.log as any).mockRestore();
    });
  });

  describe('warning', () => {
    it('should throw if the instance type is not an instanceof logger', (done) => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      function callback(logFunc: (msg: string) => Promise<void>) {
        expect(async () => {
          await logFunc('message');
        }).rejects.toThrow();

        done();
      }

      callback(log.warning);
    });

    it('should throw if the message is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.warning(undefined as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.warning(null as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is not a string or function', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.warning(1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.warning(true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is a function and the function returns a value that is not a string', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.warning(() => 1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.warning(() => true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is empty', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.warning('');
      }).rejects.toThrow();
    });

    it('should log the message to the console', async () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      jest.spyOn(log, 'warning');

      await log.warning('message');

      log.cutLogPrefix = false;

      await log.warning('message');

      expect(log.warning).toHaveBeenCalledWith('message');

      log.cutLogPrefix = true;

      // log with arguments
      await log.warning('message', 1, 2, 3);

      log.cutLogPrefix = false;

      await log.warning(() => 'message');

      await log.warning('message', 1, 2, 3);

      expect(log.warning).toHaveBeenCalledWith('message', 1, 2, 3);

      log.logToConsole = false;

      jest.spyOn(console, 'log');

      await log.warning('message');

      expect(console.log).not.toHaveBeenCalled();

      log.logLevel = LogLevel.None;

      await log.warning('message');

      expect(console.log).not.toHaveBeenCalled();

      // Stop spying on console.log
      (console.log as any).mockRestore();
      (log.warning as any).mockRestore();
    });
  });

  describe('trace', () => {
    it('should throw if the instance type is not an instanceof logger', (done) => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      function callback(logFunc: (msg: string) => Promise<void>) {
        expect(async () => {
          await logFunc('message');
        }).rejects.toThrow();

        done();
      }

      callback(log.trace);
    });

    it('should throw if the message is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.trace(undefined as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.trace(null as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is not a string or function', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.trace(1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.trace(true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is a function and the function returns a value that is not a string', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.trace(() => 1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.trace(() => true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is empty', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.trace('');
      }).rejects.toThrow();
    });

    it('should log the message to the console', async () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      jest.spyOn(log, 'trace');

      await log.trace('message');

      log.cutLogPrefix = false;

      await log.trace('message');

      expect(log.trace).toHaveBeenCalledWith('message');

      log.cutLogPrefix = true;

      // log with arguments
      await log.trace('message', 1, 2, 3);

      log.cutLogPrefix = false;

      await log.trace(() => 'message');

      await log.trace('message', 1, 2, 3);

      expect(log.trace).toHaveBeenCalledWith('message', 1, 2, 3);

      log.logToConsole = false;

      jest.spyOn(console, 'log');

      await log.trace('message');

      expect(console.log).not.toHaveBeenCalled();

      log.logLevel = LogLevel.None;

      await log.trace('message');

      expect(console.log).not.toHaveBeenCalled();

      // Stop spying on console.log
      (console.log as any).mockRestore();
      (log.trace as any).mockRestore();
    });
  });

  describe('debug', () => {
    it('should throw if the instance type is not an instanceof logger', (done) => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      function callback(logFunc: (msg: string) => Promise<void>) {
        expect(async () => {
          await logFunc('message');
        }).rejects.toThrow();

        done();
      }

      callback(log.debug);
    });

    it('should throw if the message is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.debug(undefined as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.debug(null as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is not a string or function', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.debug(1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.debug(true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is a function and the function returns a value that is not a string', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.debug(() => 1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.debug(() => true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is empty', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.debug('');
      }).rejects.toThrow();
    });

    it('should log the message to the console', async () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      jest.spyOn(log, 'debug');

      await log.debug('message');

      log.cutLogPrefix = false;

      await log.debug('message');

      expect(log.debug).toHaveBeenCalledWith('message');

      log.cutLogPrefix = true;

      // log with arguments
      await log.debug('message', 1, 2, 3);

      log.cutLogPrefix = false;

      await log.debug(() => 'message');

      await log.debug('message', 1, 2, 3);

      expect(log.debug).toHaveBeenCalledWith('message', 1, 2, 3);

      log.logToConsole = false;

      jest.spyOn(console, 'log');

      await log.debug('message');

      expect(console.log).not.toHaveBeenCalled();

      log.logLevel = LogLevel.None;

      await log.debug('message');

      expect(console.log).not.toHaveBeenCalled();

      // Stop spying on console.log
      (console.log as any).mockRestore();
      (log.debug as any).mockRestore();
    });
  });

  describe('information', () => {
    it('should throw if the instance type is not an instanceof logger', (done) => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      function callback(logFunc: (msg: string) => Promise<void>) {
        expect(async () => {
          await logFunc('message');
        }).rejects.toThrow();

        done();
      }

      callback(log.information);
    });

    it('should throw if the message is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.information(undefined as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.information(null as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is not a string or function', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.information(1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.information(true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is a function and the function returns a value that is not a string', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.information(() => 1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.information(() => true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is empty', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.information('');
      }).rejects.toThrow();
    });

    it('should log the message to the console', async () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      jest.spyOn(log, 'information');

      await log.information('message');

      log.cutLogPrefix = false;

      await log.information('message');

      expect(log.information).toHaveBeenCalledWith('message');

      log.cutLogPrefix = true;

      // log with arguments
      await log.information('message', 1, 2, 3);

      log.cutLogPrefix = false;

      await log.information(() => 'message');

      await log.information('message', 1, 2, 3);

      expect(log.information).toHaveBeenCalledWith('message', 1, 2, 3);

      log.logToConsole = false;

      jest.spyOn(console, 'log');

      await log.information('message');

      expect(console.log).not.toHaveBeenCalled();

      log.logLevel = LogLevel.None;

      await log.information('message');

      expect(console.log).not.toHaveBeenCalled();

      // Stop spying on console.log
      (console.log as any).mockRestore();
      (log.information as any).mockRestore();
    });
  });

  describe('error', () => {
    it('should throw if the instance type is not an instanceof logger', (done) => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      function callback(logFunc: (msg: string) => Promise<void>) {
        expect(async () => {
          await logFunc('message');
        }).rejects.toThrow();

        done();
      }

      callback(log.error);
    });

    it('should throw if the message is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.error(undefined as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.error(null as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is not a string or function', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.error(1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.error(true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is a function and the function returns a value that is not a string', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.error(() => 1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.error(() => true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is empty', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.error('');
      }).rejects.toThrow();
    });

    it('should log the message to the console', async () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      jest.spyOn(log, 'error');

      await log.error('message');

      log.cutLogPrefix = false;

      await log.error('message');

      expect(log.error).toHaveBeenCalledWith('message');

      log.cutLogPrefix = true;

      // log with arguments
      await log.error('message', 1, 2, 3);

      log.cutLogPrefix = false;

      await log.error(() => 'message');

      await log.error('message', 1, 2, 3);

      expect(log.error).toHaveBeenCalledWith('message', 1, 2, 3);

      log.logToConsole = false;

      jest.spyOn(console, 'log');

      await log.error('message');

      expect(console.log).not.toHaveBeenCalled();

      log.logLevel = LogLevel.None;

      await log.error('message');

      expect(console.log).not.toHaveBeenCalled();

      // Stop spying on console.log
      (console.log as any).mockRestore();
      (log.error as any).mockRestore();
    });
  });
});
