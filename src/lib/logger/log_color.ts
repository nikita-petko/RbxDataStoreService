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
	File Name: log_color.ts
	Description: A simple enum to represent the log colors.
	Written by: Nikita Petko
*/

/**
 * Represents the log colors.
 *
 * @enum {string} The log colors.
 * @internal This enum is only ingested internally.
 */
export enum LogColor {
  Reset = '\x1b[0m',
  BrightBlack = '\x1b[90m',
  BrightRed = '\x1b[91m',
  BrightYellow = '\x1b[93m',
  BrightBlue = '\x1b[94m',
  BrightMagenta = '\x1b[95m',
  BrightWhite = '\x1b[97m',
}
