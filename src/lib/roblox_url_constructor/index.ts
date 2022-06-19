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
	Description: A factory for spitting out Roblox URLs for BEDEV1 and BEDEV2.
	Written by: Nikita Petko
*/

import environment from '../environment';
import typeConverters from '../environment/type_converters';

import { RobloxPlatformType } from './roblox_web_platform_type';
import { RobloxEnvironmentType } from './roblox_environment_type';

export { RobloxPlatformType, RobloxEnvironmentType };

import * as url from 'url';
import * as util from 'util';

/**
 * A factory for spitting out Roblox URLs for BEDEV1 and BEDEV2.
 *
 * How the smart urls work are:
 * 1. The url must start with curly braces, path can be after the curly braces.
 *
 * The curly braces format is as following:
 * {platform:serviceName:serviceVersion?:environment?:trimLeadingSlashes?:addTrailingSlash?:insecure?}
 *
 * Service Name is required.
 * Service Version is optional. If not specified it will not be added to the url.
 * Environment is optional. If not specified it will default to Production. The valid characters are: ^[a-zA-Z0-9\.\-_]+$
 * Insecure is optional. If not specified it will default to false.
 *
 * Example outputs:
 * Production Base URL: https://www.roblox.com/
 * Staging Base URL: https://www.sitetest1.roblox.local/
 *
 * Production BEDEV1 Example: https://users.roblox.com/v1/users/authenticated
 * Format: {bedev1:users:v1}/users/authenticated
 *
 * Production BEDEV2 Example: https://apis.roblox.com/captcha/v1/metadata
 * Format: {bedev2:captcha:v1}/metadata
 *
 * Staging BEDEV1 Example: https://users.sitetest1.roblox.local/v1/users/authenticated
 * Format: {bedev1:users:v1:staging}/users/authenticated
 *
 * Staging BEDEV2 Example: https://apis.sitetest1.roblox.local/captcha/v1/metadata
 * Format: {bedev2:captcha:v1:staging}/metadata
 *
 * If you actually include a hostname as the environment, it will not use the current settings for the environment and will just use that as the hostname.
 *
 * So given the following:
 * {bedev1:users:v1:sitetest1.simulpong.com:true}/users/authenticated -> https://users.sitetest1.simulpong.com/v1/users/authenticated
 * {bedev2:test:v2:apis.simulpong.com:true}/test/metadata -> https://apis.simulpong.com/test/metadata (BEDEV2 Will not fill in the Base URL, this allows you to use custom Sphynx Domains)
 *
 * This will only work if you specify a hostname-like string as this parameter, and that hostname has 2+ parts.
 *
 * This can also manage URL parameters. For example:
 * the args param will replace these values in the order that they are specified
 * So if we do a call like:
 * robloxUrlConstructor.smartConstruct('{bedev1:users:v1:sitetest1.simulpong.com:true}/test/{{userId}}/{{otherArg}}', {}, 123, 'foo') -> https://users.sitetest1.simulpong.com/v1/test/123/foo
 * The names of these URL parameters are simply just for readability, they serve no purpose other than to make it easier to read the URL, meaning that /test/{{}}/{{}} is the same as the above. *
 */
export default abstract class RobloxUrlConstructor {
  /**
   * @internal This is a private method.
   */
  private static _isValidServiceName(serviceName: string): boolean {
    // Service name can only be a-z, A-Z, 0-9, - and _.
    const regex = /^[a-zA-Z0-9\-_]+$/;

    return regex.test(serviceName);
  }

  /**
   * @internal This is a private method.
   */
  private static _getHostnameFromUrl(inUrl: string): string {
    const uri = new url.URL(inUrl);

    return uri.hostname;
  }

  /**
   * @internal This is a private method.
   */
  private static _getRootHostname(hostname: string): string {
    // Only take the first subdomain of the hostname.

    const parts = hostname.split('.');

    if (parts.length <= 2) return hostname;

    parts.shift();

    return parts.join('.');
  }

  /**
   * @internal This is a private method.
   */
  private static _getBaseUrlByEnvironment(rblxEnvironment: RobloxEnvironmentType): string {
    switch (rblxEnvironment) {
      case RobloxEnvironmentType.Production:
        return environment.defaultProductionBaseUrl;
      case RobloxEnvironmentType.Staging:
        return environment.defaultStagingBaseUrl;
      case RobloxEnvironmentType.Integration:
        return environment.defaultIntegrationBaseUrl;
      case RobloxEnvironmentType.Development:
        return environment.defaultDevelopmentBaseUrl;
    }
  }

  /**
   * @internal This is a private method.
   */
  private static _getBaseHostname(rblxEnvironment: RobloxEnvironmentType) {
    return this._getRootHostname(this._getHostnameFromUrl(this._getBaseUrlByEnvironment(rblxEnvironment)));
  }

  /**
   * @internal This is a private method.
   */
  private static _constructBedev1BaseUrl(
    hostname: string,
    serviceName: string,
    rblxEnvironment?: RobloxEnvironmentType,
    insecure?: boolean,
  ): string {
    const proto = insecure ? 'http' : 'https';

    return util.format(
      '%s://%s.%s/',
      proto,
      serviceName,
      hostname || this._getBaseHostname(rblxEnvironment || environment.defaultEnvironmentType),
    );
  }

  /**
   * @internal This is a private method.
   */
  private static _constructBedev2BaseUrl(
    hostname: string,
    serviceName: string,
    rblxEnvironment?: RobloxEnvironmentType,
    insecure?: boolean,
  ): string {
    const proto = insecure ? 'http' : 'https';

    return util.format(
      '%s://apis.%s/%s/',
      proto,
      hostname || this._getBaseHostname(rblxEnvironment || environment.defaultEnvironmentType),
      serviceName,
    );
  }

  /**
   * @internal This is a private method.
   */
  private static _parsePathFormat(path: string, ...args: (number | string | boolean)[]): string {
    // Replace the {{}} with the args. If the arg at the position is undefined, it will be replaced with an empty string. Does not apply to null.
    const regex = /{{(.*?)}}/;

    let match: RegExpExecArray | { [Symbol.replace](str: string, replaceValue: string): string }[];
    let index = 0;

    match = regex.exec(path);

    if (match === null) return path;

    do {
      let arg = args[index];

      if (arg === undefined) {
        arg = '';
      }

      path = path.replace(match[0], arg.toString());

      index++;

      match = regex.exec(path);
    } while (match !== null);

    return path;
  }

  /**
   * @internal This is a private method.
   */
  private static _parseSmartUrl(
    smartUrl: string,
    query?:
      | { [key: string]: string | number | boolean | (string | number | boolean)[] }
      | Map<string, string | number | boolean | (string | number | boolean)[]>
      | object,
    ...args: (number | string | boolean)[]
  ): string {
    // In the format of {platform:serviceName:serviceVersion?:environment?:trimLeadingSlashes?:addTrailingSlash?:insecure?}[path]
    // We want to split the string and seperate the [path] part from the other parts.
    const split = smartUrl.split('}');

    // Take the first part, which is the base URL.
    const baseUrl = split.shift();

    // Take the second part, which is the path. If there's 2 or more elements in the rest of the array, then join the array back with a }.
    let path = split.length > 1 ? split.join('}') : split[0];

    // Now we want to parse the base URL and get the platform, service name, and version. If there is a part like {bedev1::v1} that means that serviceName is empty.
    // Make sure we remove the leading open curly brace.
    const baseUrlSplit = baseUrl.substring(1).split(':');

    // If it's not at least 2 parts, then it's not a valid URL.
    if (baseUrlSplit.length < 2) {
      throw new SyntaxError(
        `The format of the base URL is invalid. The base URL must be in the format of {platform:serviceName:serviceVersion?:environment?:trimLeadingSlashes?:addTrailingSlash?:insecure?}[path]?`,
      );
    }

    // The first part is the platform.
    const platform = baseUrlSplit[0];

    // Check if it's empty.
    if (platform === '') {
      throw new ReferenceError('Cannot construct URL with empty platform.');
    }

    // Check if the platform is valid.
    const upperPlatform = platform.toUpperCase();
    if (!Object.values(RobloxPlatformType).includes(upperPlatform as RobloxPlatformType)) {
      throw new TypeError(
        `Invalid platform: ${platform}. Valid values are: ${Object.values(RobloxPlatformType).join(', ')}`,
      );
    }

    // The second part is the service name.
    const serviceName = baseUrlSplit[1];

    // Check if it's empty.
    if (serviceName === '') {
      throw new ReferenceError(`Can't construct URL with empty service name.`);
    }

    // Check if it's greater than 255 characters.
    if (serviceName.length > 255) {
      throw new ReferenceError(`Service name is too long. Must be less than 255 characters.`);
    }

    // Check if the service name is valid.
    if (!this._isValidServiceName(serviceName)) {
      throw new ReferenceError(`Invalid service name: ${serviceName}`);
    }

    // The third part is the version. Basically comes before the path.
    const version = baseUrlSplit[2];

    // The fourth part is the environment.
    let rblxEnvironment = baseUrlSplit[3];

    let isUrlEnvironment = false;

    // If it's specified, then we want to check if it's a valid environment.
    if (rblxEnvironment !== undefined && rblxEnvironment !== '') {
      if (rblxEnvironment.includes('.')) {
        // The environment is a full URL. Check if it has at least 2 parts.

        // Remove leading and trailing dots.
        rblxEnvironment = rblxEnvironment.replace(/^\.+|\.+$/g, '');

        isUrlEnvironment = true;
      } else {
        const lowercaseEnvironments = Object.values(RobloxEnvironmentType).map((e) => e.toLowerCase());
        if (!lowercaseEnvironments.includes(rblxEnvironment.toLowerCase())) {
          throw new ReferenceError(
            `Invalid environment: ${rblxEnvironment}. Valid values are: ${Object.values(RobloxEnvironmentType).join(
              ', ',
            )}`,
          );
        }
      }
    }

    // The fifth part is the trimLeadingSlashes.
    const trimLeadingSlashes = typeConverters.toBoolean(baseUrlSplit[4], true);

    // The sixth part is the addTrailingSlash.
    const addTrailingSlash = typeConverters.toBoolean(baseUrlSplit[5], false);

    // The seventh part is the insecure.
    const insecure = typeConverters.toBoolean(baseUrlSplit[6], false);

    const actualPlatform = Object.values(RobloxPlatformType).find((v) => v.toLowerCase() === platform.toLowerCase());

    let newBaseUrl =
      rblxEnvironment !== undefined && rblxEnvironment !== ''
        ? this.getBaseServiceUrlByEnvironment(
            actualPlatform,
            serviceName,
            Object.values(RobloxEnvironmentType).find((v) => v.toLowerCase() === rblxEnvironment.toLowerCase()),
            insecure,
            isUrlEnvironment ? rblxEnvironment : undefined,
          )
        : this.getBaseServiceUrl(actualPlatform, serviceName, insecure, undefined);

    // If the trimLeadingSlashes is specified, then we want to add it to the URL.
    if (trimLeadingSlashes) {
      path = path.replace(/^\/+/, '');
    }

    // If the addTrailingSlash is specified, then we want to add it to the URL.
    if (addTrailingSlash) {
      if (!path.endsWith('/') && path.length !== 0) {
        path += '/';
      }
    }

    const queryString = this._parseQueryString(query);

    if (path.length === 0 && !addTrailingSlash) {
      // Remove the trailing slash if there is no path.
      return newBaseUrl.substring(0, newBaseUrl.length - 1) + queryString;
    }

    path = this._parsePathFormat(path, ...args);

    // If the version is specified, then we want to add it to the URL.
    if (version !== undefined && version !== '') {
      newBaseUrl += `${version}/`;
    }

    return `${newBaseUrl}${path}${queryString}`;
  }

  /**
   * @internal This is a private method.
   */
  private static _parseQueryString(
    query:
      | { [key: string]: string | number | boolean | (string | number | boolean)[] }
      | Map<string, string | number | boolean | (string | number | boolean)[]>
      | object,
  ) {
    if (query === undefined || query === null || Object.keys(query).length === 0) {
      return '';
    }

    const queryString = Object.entries(query).map(([key, value]) => {
      key = encodeURIComponent(key);

      if (Array.isArray(value)) {
        return value.map((v) => `${key}=${encodeURIComponent(v)}`).join('&');
      }

      return `${key}=${encodeURIComponent(value.toString())}`;
    });

    return `?${queryString.join('&')}`;
  }

  /**
   * Returns the Base URL for a Roblox Web Platform service.
   *
   * @param {RobloxPlatformType} platform The platform to get the URL for.
   * @param {string} serviceName The name of the service to get the URL for, this can either be a BEDEV1 ApiSite, or a BEDEV2 Service.
   * @param {boolean} [insecure=false] Whether or not to use an insecure connection.
   * @param {string?} [hostname=undefined] A custom hostname to override the default environment.
   * @returns {string} The base URL for the service.
   * @throws {ReferenceError} If the platform is not specified.
   * @throws {ReferenceError} If the service name is not specified.
   * @throws {ReferenceError} If the insecure flag is not specified.
   * @throws {RangeError} The service name cannot be empty.
   * @throws {RangeError} The service name cannot be longer than 255 characters.
   * @throws {RangeError} The hostname cannot be empty.
   * @throws {TypeError} If the service name is not a string.
   * @throws {TypeError} If the insecure param is not a valid boolean.
   * @throws {TypeError} If the hostname is not a string.
   * @throws {TypeError} If the platform is not a valid platform.
   * @throws {SyntaxError} If the service name is not a valid service name.
   */
  public static getBaseServiceUrl(
    platform: RobloxPlatformType,
    serviceName: string,
    insecure: boolean = false,
    hostname?: string,
  ): string {
    if (platform === undefined || platform === null) {
      throw new ReferenceError('platform cannot be null or undefined.');
    }

    if (serviceName === undefined || serviceName === null) {
      throw new ReferenceError('serviceName cannot be null or undefined.');
    }

    if (typeof serviceName !== 'string') {
      throw new TypeError('serviceName must be a string.');
    }

    if (serviceName.length === 0) {
      throw new RangeError('serviceName cannot be empty.');
    }

    if (serviceName.length > 255) {
      throw new RangeError('serviceName cannot be longer than 255 characters.');
    }

    if (insecure === undefined || insecure === null) {
      throw new ReferenceError('insecure cannot be null or undefined.');
    }

    if (typeof insecure !== 'boolean') {
      throw new TypeError('insecure must be a boolean.');
    }

    if (hostname !== undefined && hostname !== null && typeof hostname !== 'string') {
      throw new TypeError('hostname must be a string.');
    }

    if (hostname !== undefined && hostname !== null && hostname.length === 0) {
      throw new RangeError('hostname cannot be empty.');
    }

    const uppercasePlatforms = Object.values(RobloxPlatformType).map((v) => v.toUpperCase());
    if (!uppercasePlatforms.includes(platform.toUpperCase())) {
      throw new TypeError(
        `Invalid platform: ${platform}. Valid values are: ${Object.values(RobloxPlatformType).join(', ')}`,
      );
    }

    if (!this._isValidServiceName(serviceName)) {
      throw new SyntaxError('serviceName must be a valid service name.');
    }

    return platform === RobloxPlatformType.BEDEV2
      ? this._constructBedev2BaseUrl(hostname, serviceName, undefined, insecure)
      : this._constructBedev1BaseUrl(hostname, serviceName, undefined, insecure);
  }

  /**
   * Returns the URL for a Roblox Web Platform service.
   *
   * @param {RobloxPlatformType} platform The platform to get the URL for.
   * @param {string} serviceName The name of the service to get the URL for, this can either be a BEDEV1 ApiSite, or a BEDEV2 Service.
   * @param {RobloxEnvironmentType} [rblxEnvironment=Production] The environment to get the URL for.
   * @param {boolean} [insecure=false] Whether or not to use an insecure connection.
   * @param {string?} [hostname=undefined] A custom hostname to override the default environment.
   * @returns {string} The URL for the service.
   * @throws {ReferenceError} If the platform is not specified.
   * @throws {ReferenceError} If the service name is not specified.
   * @throws {ReferenceError} If the rblxEnvironment is not specified.
   * @throws {ReferenceError} If the insecure flag is not specified.
   * @throws {RangeError} The service name cannot be empty.
   * @throws {RangeError} The service name cannot be longer than 255 characters.
   * @throws {RangeError} The hostname cannot be empty.
   * @throws {TypeError} If the service name is not a string.
   * @throws {TypeError} If the platform is not a valid platform.
   * @throws {TypeError} If the rblxEnvironment is not a valid environment.
   * @throws {TypeError} If the insecure param is not a valid boolean.
   * @throws {TypeError} If the hostname is not a string.
   * @throws {SyntaxError} If the service name is not a valid service name.
   */
  public static getBaseServiceUrlByEnvironment(
    platform: RobloxPlatformType,
    serviceName: string,
    rblxEnvironment: RobloxEnvironmentType = RobloxEnvironmentType.Production,
    insecure: boolean = false,
    hostname?: string,
  ): string {
    if (platform === undefined || platform === null) {
      throw new ReferenceError('platform cannot be null or undefined.');
    }

    if (serviceName === undefined || serviceName === null) {
      throw new ReferenceError('serviceName cannot be null or undefined.');
    }

    if (rblxEnvironment === undefined || rblxEnvironment === null) {
      throw new ReferenceError('rblxEnvironment cannot be null or undefined.');
    }

    if (typeof serviceName !== 'string') {
      throw new TypeError('serviceName must be a string.');
    }

    if (serviceName.length === 0) {
      throw new RangeError('serviceName cannot be empty.');
    }

    if (serviceName.length > 255) {
      throw new RangeError('serviceName cannot be longer than 255 characters.');
    }

    if (insecure === undefined || insecure === null) {
      throw new ReferenceError('insecure cannot be null or undefined.');
    }

    if (typeof insecure !== 'boolean') {
      throw new TypeError('insecure must be a boolean.');
    }

    if (hostname !== undefined && hostname !== null && typeof hostname !== 'string') {
      throw new TypeError('hostname must be a string.');
    }

    if (hostname !== undefined && hostname !== null && hostname.length === 0) {
      throw new RangeError('hostname cannot be empty.');
    }

    const uppercasePlatforms = Object.values(RobloxPlatformType).map((p) => p.toUpperCase());
    if (!uppercasePlatforms.includes(platform.toUpperCase())) {
      throw new TypeError(
        `Invalid platform: ${platform}. Valid values are: ${Object.values(RobloxPlatformType).join(', ')}`,
      );
    }

    if (!this._isValidServiceName(serviceName)) {
      throw new SyntaxError('serviceName must be a valid service name.');
    }

    const lowercaseEnvironments = Object.values(RobloxEnvironmentType).map((e) => e.toLowerCase());
    if (!lowercaseEnvironments.includes(rblxEnvironment.toLowerCase())) {
      throw new TypeError(
        `Invalid environment: ${rblxEnvironment}. Valid values are: ${Object.values(RobloxEnvironmentType).join(', ')}`,
      );
    }

    return platform === RobloxPlatformType.BEDEV2
      ? this._constructBedev2BaseUrl(hostname, serviceName, rblxEnvironment, insecure)
      : this._constructBedev1BaseUrl(hostname, serviceName, rblxEnvironment, insecure);
  }

  /**
   * Constructs a URL for a Roblox Web Platform service.
   *
   * @param {RobloxPlatformType} platform The platform to construct the URL for.
   * @param {string} serviceName The name of the service to construct the URL for, this can either be a BEDEV1 ApiSite, or a BEDEV2 Service.
   * @param {string?} [path] The path to append to the base URL.
   * @param {boolean} [trimLeadingSlash=true] Whether or not to trim the leading slash from the path. It will prevent urls like foo.bar///baz from being converted to foo.bar/baz.
   * @param {boolean} [addTrailingSlash=false] Whether or not to add a trailing slash to the path. It will prevent urls like foo.bar/baz from being converted to foo.bar/baz/. Disabled by default because BEDEV2 services do not treat a trailing slash url as the same route.
   * @param {boolean} [insecure=false] Whether or not to use an insecure connection.
   * @param {({ [key: string]: string | number | boolean | (string | number | boolean)[] } | Map<string, string | number | boolean | (string | number | boolean)[]>)?} [query=undefined] The query string to append to the base URL.
   * @param {string?} [hostname=undefined] A custom hostname to override the default environment.
   * @param {...(string | number | boolean)} [args] Any path parameters to include in the string. They will be replaced in the order they come, this method will replacce an undefined arg with just empty string.
   * @returns {string} The URL for the service.
   * @throws {ReferenceError} If the platform is not specified.
   * @throws {ReferenceError} If the service name is not specified.
   * @throws {ReferenceError} If the trimLeadingSlash param is not specified.
   * @throws {ReferenceError} If the addTrailingSlash param is not specified.
   * @throws {ReferenceError} If the insecure param is not specified.
   * @throws {TypeError} If the platform is not a valid platform.
   * @throws {TypeError} If the service name is not a string.
   * @throws {TypeError} If the path is not a string.
   * @throws {TypeError} If the hostname is not a string.
   * @throws {TypeError} If the query parameters are not a Map or an object.
   * @throws {RangeError} The service name cannot be empty.
   * @throws {RangeError} The service name cannot be longer than 255 characters.
   * @throws {RangeError} The hostname cannot be empty.
   * @throws {SyntaxError} If the service name is not a valid service name.
   * @throws {TypeError} If the trimLeadingSlash param is not a valid boolean.
   * @throws {TypeError} If the addTrailingSlash param is not a valid boolean.
   * @throws {TypeError} If the insecure param is not a valid boolean.
   * @throws {TypeError} If the args are anything other than strings, numbers, or booleans.
   * @throws {TypeError} If the query parameters are anything other than strings, numbers, booleans or string arrays.
   */
  public static constructServiceUrl(
    platform: RobloxPlatformType,
    serviceName: string,
    path?: string,
    trimLeadingSlash: boolean = true,
    addTrailingSlash: boolean = false,
    insecure: boolean = false,
    query?:
      | { [key: string]: string | number | boolean | (string | number | boolean)[] }
      | Map<string, string | number | boolean | (string | number | boolean)[]>
      | object,
    hostname?: string,
    ...args: (string | number | boolean)[]
  ): string {
    if (platform === undefined || platform === null) {
      throw new ReferenceError('platform cannot be null or undefined.');
    }

    if (serviceName === undefined || serviceName === null) {
      throw new ReferenceError('serviceName cannot be null or undefined.');
    }

    if (typeof serviceName !== 'string') {
      throw new TypeError('serviceName must be a string.');
    }

    if (serviceName.length === 0) {
      throw new RangeError('serviceName cannot be empty.');
    }

    if (serviceName.length > 255) {
      throw new RangeError('serviceName cannot be longer than 255 characters.');
    }

    if (path === undefined || path === null) {
      path = '';
    }

    if (trimLeadingSlash === undefined || trimLeadingSlash === null) {
      throw new ReferenceError('trimLeadingSlash cannot be null or undefined.');
    }

    if (typeof trimLeadingSlash !== 'boolean') {
      throw new TypeError('trimLeadingSlash must be a boolean.');
    }

    if (addTrailingSlash === undefined || addTrailingSlash === null) {
      throw new ReferenceError('addTrailingSlash cannot be null or undefined.');
    }

    if (typeof addTrailingSlash !== 'boolean') {
      throw new TypeError('addTrailingSlash must be a boolean.');
    }

    if (insecure === undefined || insecure === null) {
      throw new ReferenceError('insecure cannot be null or undefined.');
    }

    if (typeof insecure !== 'boolean') {
      throw new TypeError('insecure must be a boolean.');
    }

    if (!this._isValidServiceName(serviceName)) {
      throw new SyntaxError('serviceName must be a valid service name.');
    }

    if (typeof path !== 'string') {
      throw new TypeError('path must be a string.');
    }

    if (hostname !== undefined && hostname !== null && typeof hostname !== 'string') {
      throw new TypeError('hostname must be a string.');
    }

    if (hostname !== undefined && hostname !== null && hostname.length === 0) {
      throw new RangeError('hostname cannot be empty.');
    }

    if (query !== undefined && query !== null) {
      if (query instanceof Map) query = Object.fromEntries(query);
      if (typeof query !== 'object') throw new TypeError('query must be an object or a Map.');

      if (Object.keys(query).length > 0) {
        for (const key of Object.keys(query)) {
          if (query[key] instanceof Array) {
            for (const value of query[key] as (string | number | boolean)[]) {
              if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
                throw new TypeError('query parameters must be strings, numbers, or booleans.');
              }
            }
          } else {
            if (typeof query[key] !== 'string' && typeof query[key] !== 'number' && typeof query[key] !== 'boolean') {
              throw new TypeError('query parameters must be strings, numbers, or booleans.');
            }
          }
        }
      }
    }

    if (args.length > 0) {
      for (const arg of args) {
        if (typeof arg !== 'string' && typeof arg !== 'number' && typeof arg !== 'boolean') {
          throw new TypeError('args must be strings, numbers, or booleans.');
        }
      }
    }

    const uppercasePlatforms = Object.values(RobloxPlatformType).map((p) => p.toUpperCase());
    if (!uppercasePlatforms.includes(platform.toUpperCase())) {
      throw new TypeError(
        `Invalid platform: ${platform}. Valid values are: ${Object.values(RobloxPlatformType).join(', ')}`,
      );
    }

    const baseUrl = this.getBaseServiceUrl(platform, serviceName, insecure, hostname); // should already have a trailing slash

    // Check if path starts with a slash.
    if (path.startsWith('/')) {
      if (trimLeadingSlash) {
        path = path.replace(/^\/+/, '');
      }
    }

    // Check if path does not end with a slash.
    if (addTrailingSlash) {
      if (!path.endsWith('/')) {
        path += '/';
      }
    }

    const queryString = this._parseQueryString(query);

    if (path.length === 0 && !addTrailingSlash) {
      // Remove the trailing slash if there is no path.
      return baseUrl.substring(0, baseUrl.length - 1) + queryString;
    }

    // Parse the args into a string.
    path = this._parsePathFormat(path, ...args);

    return `${baseUrl}${path}${queryString}`;
  }

  /**
   * Constructs a URL for a Roblox Web Platform service by environment
   *
   * @param {RobloxPlatformType} platform The platform to construct the URL for.
   * @param {string} serviceName The name of the service to construct the URL for, this can either be a BEDEV1 ApiSite, or a BEDEV2 Service.
   * @param {RobloxEnvironmentType} rblxEnvironment The environment to construct the URL for.
   * @param {string?} path The path to append to the base URL.
   * @param {boolean} [trimLeadingSlash=true] Whether or not to trim the leading slash from the path. It will prevent urls like foo.bar///baz from being converted to foo.bar/baz.
   * @param {boolean} [addTrailingSlash=false] Whether or not to add a trailing slash to the path. It will prevent urls like foo.bar/baz from being converted to foo.bar/baz/. Disabled by default because BEDEV2 services do not treat a trailing slash url as the same route.
   * @param {boolean} [insecure=false] Whether or not to use an insecure connection.
   * @param {({ [key: string]: string | number | boolean | (string | number | boolean)[] } | Map<string, string | number | boolean | (string | number | boolean)[]>)?} [query=undefined] The query string to append to the base URL.
   * @param {string?} [hostname=undefined] A custom hostname to override the default environment.
   * @param {...(string | number | boolean)} [args] Any path parameters to include in the string. They will be replaced in the order they come, this method will replacce an undefined arg with just empty string.
   * @returns {string} The URL for the service.
   * @throws {ReferenceError} If the platform is not specified.
   * @throws {ReferenceError} If the service name is not specified.
   * @throws {ReferenceError} If the trimLeadingSlash param is not specified.
   * @throws {ReferenceError} If the addTrailingSlash param is not specified.
   * @throws {ReferenceError} If the insecure param is not specified.
   * @throws {ReferenceError} If the rblxEnvironment param is not specified.
   * @throws {TypeError} If the platform is not a valid platform.
   * @throws {TypeError} If the rblxEnvironment is not a valid environment.
   * @throws {TypeError} If the service name is not a string.
   * @throws {TypeError} If the path is not a string.
   * @throws {TypeError} If the hostname is not a string.
   * @throws {TypeError} If the query parameters are not a Map or an object.
   * @throws {RangeError} The service name cannot be empty.
   * @throws {RangeError} The service name cannot be longer than 255 characters.
   * @throws {RangeError} The hostname cannot be empty.
   * @throws {SyntaxError} If the service name is not a valid service name.
   * @throws {TypeError} If the trimLeadingSlash param is not a valid boolean.
   * @throws {TypeError} If the addTrailingSlash param is not a valid boolean.
   * @throws {TypeError} If the insecure param is not a valid boolean.
   * @throws {TypeError} If the args are anything other than strings, numbers, or booleans.
   * @throws {TypeError} If the query parameters are anything other than strings, numbers, booleans or string arrays.
   */
  public static constructServiceUrlByEnvironment(
    platform: RobloxPlatformType,
    serviceName: string,
    rblxEnvironment: RobloxEnvironmentType,
    path?: string,
    trimLeadingSlash: boolean = true,
    addTrailingSlash: boolean = false,
    insecure: boolean = false,
    query?:
      | { [key: string]: string | number | boolean | (string | number | boolean)[] }
      | Map<string, string | number | boolean | (string | number | boolean)[]>
      | object,
    hostname?: string,
    ...args: (string | number | boolean)[]
  ): string {
    if (platform === undefined || platform === null) {
      throw new ReferenceError('platform cannot be null or undefined.');
    }

    if (serviceName === undefined || serviceName === null) {
      throw new ReferenceError('serviceName cannot be null or undefined.');
    }

    if (typeof serviceName !== 'string') {
      throw new TypeError('serviceName must be a string.');
    }

    if (serviceName.length === 0) {
      throw new RangeError('serviceName cannot be empty.');
    }

    if (serviceName.length > 255) {
      throw new RangeError('serviceName cannot be longer than 255 characters.');
    }

    if (path === undefined || path === null) {
      path = '';
    }

    if (rblxEnvironment === undefined || rblxEnvironment === null) {
      throw new ReferenceError('rblxEnvironment cannot be null or undefined.');
    }

    if (trimLeadingSlash === undefined || trimLeadingSlash === null) {
      throw new ReferenceError('trimLeadingSlash cannot be null or undefined.');
    }

    if (typeof trimLeadingSlash !== 'boolean') {
      throw new TypeError('trimLeadingSlash must be a boolean.');
    }

    if (addTrailingSlash === undefined || addTrailingSlash === null) {
      throw new ReferenceError('addTrailingSlash cannot be null or undefined.');
    }

    if (typeof addTrailingSlash !== 'boolean') {
      throw new TypeError('addTrailingSlash must be a boolean.');
    }

    if (insecure === undefined || insecure === null) {
      throw new ReferenceError('insecure cannot be null or undefined.');
    }

    if (typeof insecure !== 'boolean') {
      throw new TypeError('insecure must be a boolean.');
    }

    if (!this._isValidServiceName(serviceName)) {
      throw new SyntaxError('serviceName must be a valid service name.');
    }

    if (typeof path !== 'string') {
      throw new TypeError('path must be a string.');
    }

    if (hostname !== undefined && hostname !== null && typeof hostname !== 'string') {
      throw new TypeError('hostname must be a string.');
    }

    if (hostname !== undefined && hostname !== null && hostname.length === 0) {
      throw new RangeError('hostname cannot be empty.');
    }

    if (query !== undefined && query !== null) {
      if (query instanceof Map) query = Object.fromEntries(query);
      if (typeof query !== 'object') throw new TypeError('query must be an object or a Map.');

      if (Object.keys(query).length > 0) {
        for (const key of Object.keys(query)) {
          if (query[key] instanceof Array) {
            for (const value of query[key] as (string | number | boolean)[]) {
              if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
                throw new TypeError('query parameters must be strings, numbers, or booleans.');
              }
            }
          } else {
            if (typeof query[key] !== 'string' && typeof query[key] !== 'number' && typeof query[key] !== 'boolean') {
              throw new TypeError('query parameters must be strings, numbers, or booleans.');
            }
          }
        }
      }
    }

    if (args.length > 0) {
      for (const arg of args) {
        if (typeof arg !== 'string' && typeof arg !== 'number' && typeof arg !== 'boolean') {
          throw new TypeError('args must be strings, numbers, or booleans.');
        }
      }
    }

    const uppercasePlatforms = Object.values(RobloxPlatformType).map((p) => p.toUpperCase());
    if (!uppercasePlatforms.includes(platform.toUpperCase())) {
      throw new TypeError(
        `Invalid platform: ${platform}. Valid values are: ${Object.values(RobloxPlatformType).join(', ')}`,
      );
    }

    const lowercaseEnvironments = Object.values(RobloxEnvironmentType).map((p) => p.toLowerCase());
    if (!lowercaseEnvironments.includes(rblxEnvironment.toLowerCase())) {
      throw new TypeError(
        `Invalid environment: ${rblxEnvironment}. Valid values are: ${Object.values(RobloxEnvironmentType).join(', ')}`,
      );
    }

    const baseUrl = this.getBaseServiceUrlByEnvironment(platform, serviceName, rblxEnvironment, insecure, hostname); // should already have a trailing slash

    // Check if path starts with a slash.
    if (path.startsWith('/')) {
      if (trimLeadingSlash) {
        path = path.replace(/^\/+/, '');
      }
    }

    // Check if path does not end with a slash.
    if (addTrailingSlash) {
      if (!path.endsWith('/')) {
        path += '/';
      }
    }

    const queryString = this._parseQueryString(query);

    if (path.length === 0 && !addTrailingSlash) {
      // Remove the trailing slash if there is no path.
      return baseUrl.substring(0, baseUrl.length - 1) + queryString;
    }

    // Parse the args into a string.
    path = this._parsePathFormat(path, ...args);

    return `${baseUrl}${path}${queryString}`;
  }

  /**
   * Constructs a URL for a Roblox Web Platform service by smart url
   *
   * @param {string} smartUrl The smart url to construct the URL for.
   * @param {({ [key: string]: string | number | boolean | (string | number | boolean)[] } | Map<string, string | number | boolean | (string | number | boolean)[]>)?} [query=undefined] The query string to append to the base URL.
   * @param {...(string | number | boolean)} [args] Any path parameters to include in the string. They will be replaced in the order they come, this method will replacce an undefined arg with just empty string.
   * @returns {string} The URL for the service.
   * @throws {ReferenceError} If the smartUrl is not specified.
   * @throws {TypeError} If the smartUrl is not a valid string.
   * @throws {TypeError} If the args are anything other than strings, numbers, or booleans.
   * @throws {SyntaxError} If the smartUrl is not a valid smart url.
   * @throws {ReferenceError} If the platform is not specified.
   * @throws {ReferenceError} If the service name is not specified.
   * @throws {ReferenceError} If the rblxEnvironment is not specified.
   * @throws {ReferenceError} If the trimLeadingSlash param is not specified.
   * @throws {ReferenceError} If the addTrailingSlash param is not specified.
   * @throws {ReferenceError} If the insecure param is not specified.
   * @throws {TypeError} If the platform is not a valid platform.
   * @throws {SyntaxError} If the service name is not a valid service name.
   * @throws {TypeError} If the rblxEnvironment is not a valid environment.
   * @throws {TypeError} If the trimLeadingSlash is not a valid boolean.
   * @throws {TypeError} If the addTrailingSlash is not a valid boolean.
   * @throws {TypeError} If the insecure is not a valid boolean.
   */
  public static smartConstruct(
    smartUrl: string,
    query?:
      | { [key: string]: string | number | boolean | (string | number | boolean)[] }
      | Map<string, string | number | boolean | (string | number | boolean)[]>
      | object,
    ...args: (string | number | boolean)[]
  ): string {
    if (smartUrl === undefined || smartUrl === null) {
      throw new ReferenceError('smartUrl cannot be null or undefined.');
    }

    if (typeof smartUrl !== 'string') {
      throw new TypeError('smartUrl must be a string.');
    }

    if (smartUrl.length === 0) {
      throw new RangeError('smartUrl cannot be empty.');
    }

    // Must start with a curly brace.
    if (smartUrl.charAt(0) !== '{') {
      throw new SyntaxError('smartUrl must start with a curly brace.');
    }

    // Must have a closing curly brace somewhere else.
    if (smartUrl.indexOf('}') === -1) {
      throw new SyntaxError('smartUrl must have a closing curly brace.');
    }

    if (query !== undefined && query !== null) {
      if (query instanceof Map) query = Object.fromEntries(query);
      if (typeof query !== 'object') throw new TypeError('query must be an object or a Map.');

      if (Object.keys(query).length > 0) {
        for (const key of Object.keys(query)) {
          if (query[key] instanceof Array) {
            for (const value of query[key] as (string | number | boolean)[]) {
              if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
                throw new TypeError('query parameters must be strings, numbers, or booleans.');
              }
            }
          } else {
            if (typeof query[key] !== 'string' && typeof query[key] !== 'number' && typeof query[key] !== 'boolean') {
              throw new TypeError('query parameters must be strings, numbers, or booleans.');
            }
          }
        }
      }
    }

    if (args.length > 0) {
      for (const arg of args) {
        if (typeof arg !== 'string' && typeof arg !== 'number' && typeof arg !== 'boolean') {
          throw new TypeError('args must be strings, numbers, or booleans.');
        }
      }
    }

    const newUrl = this._parseSmartUrl(smartUrl, query, ...args);

    return newUrl;
  }
}
