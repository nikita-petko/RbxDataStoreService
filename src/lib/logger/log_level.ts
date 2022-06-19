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
	File Name: log_level.ts
	Description: A simple enum to represent the log levels.
	Written by: Nikita Petko
*/

/**
 * Represents the log level.
 *
 * @enum {string} The log levels.
 * @internal This enum is only ingested internally.
 */
export enum LogLevel {
  None = 'none',
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
  Debug = 'debug',
  Trace = 'trace',
}
