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
	File Name: roblox_web_platform_type.ts
	Description: An enum that specifies the type of Roblox Web Platform, either BEDEV1 or BEDEV2.
	Written by: Nikita Petko
*/

/**
 * An enum that specifies the type of Roblox Web Platform, either BEDEV1 or BEDEV2.
 *
 * @enum {string} The log colors.
 * @internal This enum is only ingested internally.
 */
export enum RobloxPlatformType {
  /**
   * The long running platform that has been around since the beginning.
   *
   * These services are slowly being deprecated, but it will take a long time to completely remove them.
   *
   * They are the ApiSites specified like:
   * {serviceName}.roblox.com
   *
   * The Service specified like:
   * {serviceName}.[api|service].roblox.com (While 'service' subdomain can be used, it is more primarily used for BEDEV2 services that aren't on Sphynx.)
   */
  BEDEV1 = 'BEDEV1',

  /**
   * The latest Roblox Platform, which is being integrated into a lot of new systems.
   *
   * These services are being adopted more by the community, and are being integrated into the new systems.
   * With OpenCloud, this will eventually become the main platform.
   *
   * The service specified like:
   * apis.roblox.com/{serviceName}/{version}/{path}
   *
   * These services are accessed through apis.roblox.com (Sphynx, formally known as the Api Gateway).
   */
  BEDEV2 = 'BEDEV2',
}
