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

