import logger from './lib/logger';
import { LogLevel } from './lib/logger/log_level';

logger.singleton.logLevel = LogLevel.Trace;

logger.singleton.log('This is a test log message.');
logger.singleton.warning('This is a test warning message.');
logger.singleton.debug('This is a test debug message.');
logger.singleton.information('This is a test info message.');
logger.singleton.error('This is a test error message.');
logger.singleton.trace('This is a test trace message.');

const testConsoleLogger = new logger('test-console-logger', LogLevel.Trace, false, true, true);

testConsoleLogger.log('This is a test log message.');
testConsoleLogger.warning('This is a test warning message.');
testConsoleLogger.debug('This is a test debug message.');
testConsoleLogger.information('This is a test info message.');
testConsoleLogger.error('This is a test error message.');
testConsoleLogger.trace('This is a test trace message.');

const testFileSystemLogger = new logger('test-file-system-logger', LogLevel.Trace, true, false, true);

testFileSystemLogger.log('This is a test log message.');
testFileSystemLogger.warning('This is a test warning message.');
testFileSystemLogger.debug('This is a test debug message.');
testFileSystemLogger.information('This is a test info message.');
testFileSystemLogger.error('This is a test error message.');
testFileSystemLogger.trace('This is a test trace message.');

logger.noopSingleton.log('This is a test log message.');
logger.noopSingleton.warning('This is a test warning message.');
logger.noopSingleton.debug('This is a test debug message.');
logger.noopSingleton.information('This is a test info message.');
logger.noopSingleton.error('This is a test error message.');
logger.noopSingleton.trace('This is a test trace message.');
