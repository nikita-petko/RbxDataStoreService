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
    File Name: type_converters.ts
    Description: A simple helper that converts the given value to the given type.
    Written by: Nikita Petko
*/

/**
 * A simple helper that converts the given value to the given type.
 *
 * @internal This class is only ingested internally.
 */
export default abstract class TypeConverters {
  /**
   * Converts the given value to a boolean.
   *
   * @example
   * ```typescript
   * import convert from '@lib/environment/type_converters';
   *
   * convert.toBoolean(true); // true
   * convert.toBoolean(false); // false
   * convert.toBoolean(1); // true
   * convert.toBoolean(0); // false
   * convert.toBoolean('true'); // true
   * convert.toBoolean('false'); // false
   * convert.toBoolean('1'); // true
   * convert.toBoolean('0'); // false
   * ```
   * @param {any} value The value to be converted.
   * @param {boolean?} defaultValue The default value to be returned if the given value cannot be converted to a boolean.
   * @returns {boolean} The converted value.
   */
  public static toBoolean(value: any, defaultValue?: boolean): boolean {
    if (typeof value === 'boolean') return value;

    const valueAsNumber = parseInt(value, 10);

    if (!isNaN(valueAsNumber)) {
      return valueAsNumber > 0;
    }

    const defaultReturn = defaultValue !== undefined && defaultValue !== null ? defaultValue : false;
    value = typeof value === 'string' ? value.toLowerCase() : null;
    if (value === null) return defaultReturn;
    try {
      return JSON.parse(value);
    } catch {
      return defaultReturn;
    }
  }
}
