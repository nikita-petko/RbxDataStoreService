import { Constants } from '../Util/Constants';
import http, { AxiosRequestConfig } from 'axios';
import {
	DFFlag,
	DYNAMIC_FASTFLAGVARIABLE,
	FASTFLAG,
	FASTLOG,
	FASTLOG1,
	FASTLOG2,
	FASTLOG3,
	FASTLOGS,
	FFlag,
	FLog,
	LOGVARIABLE,
} from '../Tools/FastLogTool';
import { UniversesHelper } from './UniversesHelper';
import { BaseURL } from '../Tools/UrlTool';
import { Globals } from '../Util/Globals';
import { Agent } from 'https';
import { Analytics } from './AnalyticsHelper';
import { ErrorHelper } from './ErrorHelper';
import { SkinnyUserResponse } from '../Models/SkinnyUserResponse';
import { ApiArrayResponse } from '../Models/ApiArrayResponse';
import { UniverseIdPermissionsModel } from '../Models/UniverseIdPermissionsModel';
import { ErrorType } from '../Enumeration/ErrorType';

LOGVARIABLE('Auth', 0);
DYNAMIC_FASTFLAGVARIABLE('WeCareAboutTheWarning', true);
FASTFLAG('Debug');

LOGVARIABLE('Auth', 0);

DYNAMIC_FASTFLAGVARIABLE('WeCareAboutTheWarning', true);

FASTFLAG('Debug');

export class AuthenticationHelper {
	/**
	 * @internal
	 */
	private static readonly _sharedHttpsAgent = new Agent({ rejectUnauthorized: !FFlag['Debug'] });

	/**
	 * @internal
	 */
	private static GetSharedRequestConfiguration(url: string, cookie: string, placeID: number): AxiosRequestConfig {
		return {
			url: url,
			method: 'GET',
			headers: {
				...Globals.GlobalHeaders(),
				Cookie: '.ROBLOSECURITY=' + cookie,
				'Roblox-Place-Id': placeID.toString(),
			},
			httpsAgent: AuthenticationHelper._sharedHttpsAgent,
		};
	}

	/**
	 * @internal
	 */
	public static CheckCookieAndPlaceIdInternalAsync(cookie: string, placeID: number): Promise<void> {
		return new Promise(async (resumeFunction, errorFunction) => {
			if (!cookie) {
				FASTLOG(FLog['Auth'], '[FLog::Auth] The cookie was null or was not a string, aborting.');
				return errorFunction('Cookie cannot be null or undefined.');
			}
			if (typeof cookie === 'string' && cookie.length === 0) {
				FASTLOG(FLog['Auth'], '[FLog::Auth] The cookie was empty or was not a string, aborting.');
				return errorFunction("Cookie name can't be empty");
			}
			if (placeID < 1) {
				FASTLOG1(FLog['Auth'], '[FLog::Auth] The placeID was %i when it was expected to be >1', placeID);
				return errorFunction('The placeID is required to at least be >1');
			}
			if (!cookie.match(Constants.CookieWarningCapture) && DFFlag('WeCareAboutTheWarning')) {
				FASTLOG(
					FLog['Auth'],
					'[FLog::Auth] The cookie was invalid because it did not contain the warning text.',
				);
				return errorFunction("Cookie isn't valid, it requires the warning text to be present.");
			}
			const authenticatedUserUrl = BaseURL.ConstructServicePathFromSubDomain(
				'users',
				'v1/users/authenticated',
				null,
				true,
				false,
				true,
			);
			try {
				const authenticatedUser = <SkinnyUserResponse>(
					(
						await http.request(
							AuthenticationHelper.GetSharedRequestConfiguration(authenticatedUserUrl, cookie, placeID),
						)
					).data
				);
				FASTLOG3(
					FLog['Auth'],
					'[FLog::Auth] Our cookie check succeeded for user %s - %s (%d), try validate the place ownership and call the resumeFunction()',
					authenticatedUser.name,
					authenticatedUser.displayName,
					authenticatedUser.id,
				);
				Globals.UserID = authenticatedUser.id;
				Globals.Cookie = cookie;
				const universeId = await UniversesHelper.GetUniverseIDFromPlaceID(placeID);
				const universePermissionsUrl = BaseURL.ConstructServicePathFromSubDomain(
					'develop',
					'v1/universes/multiget/permissions',
					{ ids: [universeId] },
					true,
					false,
					true,
				);

				const universePermissions = <ApiArrayResponse<UniverseIdPermissionsModel>>(
					(
						await http.request(
							AuthenticationHelper.GetSharedRequestConfiguration(universePermissionsUrl, cookie, placeID),
						)
					).data
				);
				if (universePermissions.data !== null && universePermissions.data.length === 0) {
					await Analytics.GoogleAnalytics.trackEvent(
						'Authentication',
						'EmptyUniversePermissionsResponse',
						`User '${Globals.UserID.toString()}' for place '${placeID}'`,
						0,
					);
					FASTLOG(
						FLog['Auth'],
						"[FLog::Auth] Our Place check failed because the response's data had an invalid length, call the errorFunction().",
					);
					return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.CANNOT_PARSE_RESPONSE));
				}

				const noAccess = !universePermissions.data[0].canCloudEdit && !universePermissions.data[0].canManage;

				if (noAccess) {
					await Analytics.GoogleAnalytics.trackEvent(
						'Authentication',
						'UserHadNoPermissions',
						`User '${Globals.UserID.toString()}' for place '${placeID}'`,
						0,
					);
					FASTLOG(
						FLog['Auth'],
						'[FLog::Auth] Our Place check failed because the user does not have the valid credentials to manage this place, call the errorFunction().',
					);
					return errorFunction(`You do not have valid permission to manage the place ${placeID}`);
				}
				await Analytics.GoogleAnalytics.trackEvent(
					'Authentication',
					'PermissionsCheckSuccess',
					`User '${Globals.UserID.toString()}' for place '${placeID}'`,
					0,
				);
				FASTLOG2(
					FLog['Auth'],
					'[FLog::Auth] Our Place check succeeded for %d (%d), call the resumeFunctiom()',
					placeID,
					universeId,
				);
				return resumeFunction();
			} catch (ex) {
				await Analytics.GoogleAnalytics.trackEvent(
					'Authentication',
					'AuthenticationFailure',
					ErrorHelper.GetErrorResponseAndReturnMessage(ex),
					0,
				);
				FASTLOGS(
					FLog['Auth'],
					'[FLog::Auth] Our authentication check failed because %s, most likely due to a credential mis-match or a permissions mis-match, call the errorFunction()',
					ex.message,
				);
				return errorFunction(ErrorHelper.GetErrorResponseAndReturnMessage(ex));
			}
		});
	}

	/**
	 * Initializes the global cookie and place id, and tries to validate:
	 * 1. The validity of the cookie.
	 * 2. The ownership of the user to the place.
	 * @param {string} cookie The cookie to use, must include the warning text.
	 * @param {number} placeID The place ID to use, the user that is dependent on the cookie must have edit permissions for this place.
	 */
	public static async InitAuthenticatedUser(cookie: string, placeID: number): Promise<void> {
		return new Promise((resumeFunction, errorFunction) => {
			FASTLOG1(FLog['Auth'], '[FLog::Auth] Trying to authenticate the user with the placeID %i', placeID);
			AuthenticationHelper.CheckCookieAndPlaceIdInternalAsync(cookie, placeID)
				.then(() => {
					Globals.PlaceID = placeID;
					resumeFunction();
				})
				.catch(errorFunction);
		});
	}
}
