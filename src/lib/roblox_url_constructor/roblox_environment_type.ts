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
	File Name: roblox_environment_type.ts
	Description: The environment type, either Production, Staging, Integration, or Development.
               Please note the following:
                - Production is the default environment type, and is the only environment type that is available to the public.
                - Production's Base URL is https://www.roblox.com
                - Staging's Base URL is https://www.sitetest1.robloxlabs.com
                - Integration's Base URL is https://www.sitetest2.robloxlabs.com
                - Development's Base URL is https://www.sitetest3.robloxlabs.com
	Written by: Nikita Petko
*/

/**
 * Represents the environment type.
 * 
 * @enum {string} The environment types.
 * @internal This enum is only ingested internally.
 */
export enum RobloxEnvironmentType {
  /**
   * The default environment type, and is the only environment type that is available to the public.
   * 
   * Production's Base URL is https://www.roblox.com
   */
  Production = "Production",

  /**
   * Used by Roblox Engineers to test their Roblox applications on a production-like environment.
   * 
   * Staging's Base URL is https://www.sitetest1.robloxlabs.com
   */
  Staging = "Staging",

  /**
   * Used by Roblox Developers to run components and tests on a development-like environment.
   * 
   * Integration's Base URL is https://www.sitetest2.robloxlabs.com
   */
  Integration = "Integration",

  /**
   * Used by Roblox Developers to run their apps and tests on a development-like environment.
   * 
   * Development's Base URL is https://www.sitetest3.robloxlabs.com
   * 
   * The special part about this is the Employee Specific subdomains.
   */
  Development = "Development"
}