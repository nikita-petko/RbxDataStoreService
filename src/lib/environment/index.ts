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
    File Name: index.ts
    Description: A class for loading environment variables from .env files programmatically.
    Written by: Nikita Petko
*/

import dotenvLoader from './dotenv_loader';
import typeConverters from './type_converters';
import { LogLevel } from '../logger/log_level';
import { RobloxEnvironmentType } from '../roblox_url_constructor/roblox_environment_type';

import * as fs from 'fs';

/**
 * A class for loading environment variables from .env files programmatically.
 *
 * @internal This class is only ingested internally.
 */
export default class Environment {
  /**
   * @internal This is a private member.
   */
  private static _isDocker?: boolean = undefined;

  /**
   * Tries to get then deserialize the value of the environment variable..
   *
   * @param {string} key The key of the environment variable.
   * @param {T | (() => T)} [defaultValue] The default value of the environment variable.
   * @param {boolean=} [reloadEnvironment=true] Whether the environment variable is required.
   * @returns {T} The value of the environment variable.
   * @template T The type of the environment variable.
   * @internal This method is only ingested internally. This is a private method.
   * @private This method is a private method of the Environment class.
   * @static
   * @memberof Environment
   */
  private static _getOrDefault<T>(key: string, defaultValue?: T | (() => T), reloadEnvironment: boolean = true): T {
    // If default value is null, undefined or any type that cannot be inferred then throw
    if (defaultValue === null || defaultValue === undefined) {
      throw new Error('The default value must not be null or undefined.');
    }

    if (reloadEnvironment) dotenvLoader.reloadEnvironment();

    const value = process.env[key];

    switch (typeof defaultValue) {
      case 'boolean':
        return typeConverters.toBoolean(value, defaultValue) as unknown as T;
      case 'number':
        return parseInt(value ?? defaultValue?.toString(), 10) as unknown as T;
      case 'function':
        return (value as unknown as T) || defaultValue?.call(null);
      default:
        if (Array.isArray(defaultValue)) {
          return (value?.split(',') as unknown as T) ?? defaultValue;
        }
        if (defaultValue instanceof RegExp) {
          return new RegExp(value ?? defaultValue.source, defaultValue.flags) as unknown as T;
        }
        if (typeof defaultValue === 'object') {
          return JSON.parse(value ?? JSON.stringify(defaultValue)) as unknown as T;
        }

        return (value as unknown as T) || defaultValue;
    }
  }

  /**
   * Determines if the current context has the .dockerenv file.
   * @returns {boolean} True if the current context has the .dockerenv file.
   */
  public static hasDockerEnv(): boolean {
    if (process.platform !== 'linux') return false;

    return fs.existsSync('/.dockerenv');
  }

  /**
   * Determines if the current context has `docker` within it's CGroup.
   * @returns {boolean} True if the current context has `docker` within it's CGroup.
   */
  public static hasDockerCGroup(): boolean {
    if (process.platform !== 'linux') return false;

    try {
      return fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker');
    } catch {
      return false;
    }
  }

  /**
   * Determines if the current context is running under a docker container.
   * @returns {boolean} True if the current context is running under a docker container.
   */
  public static isDocker(): boolean {
    if (process.platform !== 'linux') return false;

    if (this._isDocker === undefined) {
      this._isDocker = this.hasDockerEnv() || this.hasDockerCGroup();
    }

    return this._isDocker;
  }

  /**
   * This is only ingested by the Logger class.
   *
   * If you set this environment variable, the logger will persist it's log files even if a clearance is requested.
   */
  /* istanbul ignore next */
  public static get persistLocalLogs(): boolean {
    /* istanbul ignore next */
    return this._getOrDefault('PERSIST_LOCAL_LOGS', false);
  }

  /**
   * Used by the logger.
   *
   * If true, we will also log to the file system.
   */
  /* istanbul ignore next */
  public static get logToFileSystem(): boolean {
    /* istanbul ignore next */
    return this._getOrDefault('LOG_TO_FILE_SYSTEM', true);
  }

  /**
   * Used by the logger.
   *
   * If true, we will also log to the console.
   */
  /* istanbul ignore next */
  public static get logToConsole(): boolean {
    /* istanbul ignore next */
    return this._getOrDefault('LOG_TO_CONSOLE', true);
  }

  /**
   * Used by the logger.
   *
   * A loglevel for the logger.
   */
  /* istanbul ignore next */
  public static get logLevel(): LogLevel {
    /* istanbul ignore next */
    return this._getOrDefault('LOG_LEVEL', LogLevel.None); // default to none
  }

  /**
   * Used by the logger.
   *
   * If true, then the logger will cut the prefix of the log message in order to read the log message more easily.
   * @note This is advised for use in production.
   */
  /* istanbul ignore next */
  public static get loggerCutPrefix(): boolean {
    /* istanbul ignore next */
    return this._getOrDefault('LOGGER_CUT_PREFIX', true);
  }

  /**
   * Used by the logger.
   *
   * The default name of the logger.
   */
  /* istanbul ignore next */
  public static get loggerDefaultName(): string {
    /* istanbul ignore next */
    return this._getOrDefault('LOGGER_DEFAULT_NAME', 'default-logger');
  }

  /**
   * Used by the Roblox URL Constructor.
   *
   * The default environment type to use. Defaults to Production.
   */
  /* istanbul ignore next */
  public static get defaultEnvironmentType(): RobloxEnvironmentType {
    /* istanbul ignore next */
    return this._getOrDefault('DEFAULT_ENVIRONMENT_TYPE', RobloxEnvironmentType.Production);
  }

  /**
   * Used by the Roblox URL Constructor.
   * 
   * Represents the default Production Base URL. If in the format of {proto}://{host}:{port} the root hostname will be extracted.
   */
  /* istanbul ignore next */
  public static get defaultProductionBaseUrl(): string {
    /* istanbul ignore next */
    return this._getOrDefault('DEFAULT_PRODUCTION_BASE_URL', 'https://www.roblox.com');
  }

  /**
   * Used by the Roblox URL Constructor.
   * 
   * Represents the default Staging Base URL. If in the format of {proto}://{host}:{port} the root hostname will be extracted.
   */
  /* istanbul ignore next */
  public static get defaultStagingBaseUrl(): string {
    /* istanbul ignore next */
    return this._getOrDefault('DEFAULT_STAGING_BASE_URL', 'https://www.sitetest1.robloxlabs.com');
  }

  /**
   * Used by the Roblox URL Constructor.
   * 
   * Represents the default Integration Base URL. If in the format of {proto}://{host}:{port} the root hostname will be extracted.
   */
  /* istanbul ignore next */
  public static get defaultIntegrationBaseUrl(): string {
    /* istanbul ignore next */
    return this._getOrDefault('DEFAULT_INTEGRATION_BASE_URL', 'https://www.sitetest2.robloxlabs.com');
  }

  /**
   * Used by the Roblox URL Constructor.
   * 
   * Represents the default Development Base URL. If in the format of {proto}://{host}:{port} the root hostname will be extracted.
   */
  /* istanbul ignore next */
  public static get defaultDevelopmentBaseUrl(): string {
    /* istanbul ignore next */
    return this._getOrDefault('DEFAULT_DEVELOPMENT_BASE_URL', 'https://www.sitetest3.robloxlabs.com');
  }
}
