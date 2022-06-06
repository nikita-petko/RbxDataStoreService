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
	File Name: dirname.ts
	Description: A class that sets the root directory of this package at runtime.
	Written by: Nikita Petko
*/

export default abstract class Dirname {
  private static _dirname: string;

  /**
   * Gets the root directory of this package.
   *
   * @returns {string} The root directory of this package.
   * @internal This getter is only ingested internally.
   * @static
   * @memberof Dirname
   */
  static get packageDirname(): string {
    return this._dirname;
  }

  /**
   * Sets the root directory of this package.
   *
   * @param {string} dirname The root directory of this package.
   * @internal This setter is only ingested internally.
   * @static
   * @memberof Dirname
   */
  static set packageDirname(dirname: string) {
    this._dirname = dirname;
  }
}
