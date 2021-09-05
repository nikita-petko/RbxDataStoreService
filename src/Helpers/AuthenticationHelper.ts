//C:\Users\Asjasx\Git\RbxDataStoreService\src\Helpers\Internal\checkCookieAndPlaceIdInternalAsync.ts
//C:\Users\Asjasx\Git\RbxDataStoreService\src\Helpers\InitAuthenticatedUser.ts
import { Constants } from '../Util/Constants';
import Http from 'axios';
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

LOGVARIABLE('Auth', 0);

DYNAMIC_FASTFLAGVARIABLE('WeCareAboutTheWarning', true);

FASTFLAG('Debug');

/**
 * @internal
 */
export class AuthenticationHelper {
	public static CheckCookieAndPlaceIdInternalAsync(cookie: string, placeID: number): Promise<void> {
		return new Promise((resumeFunction, errorFunction) => {
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
				return errorFunction("Cookie isn't valid, it requires the warning text to persistent");
			}
			Http.request({
				url: BaseURL.ConstructServicePathFromSubDomain(
					'users',
					'v1/users/authenticated',
					null,
					true,
					false,
					true,
				),
				method: 'GET',
				headers: {
					...Globals.GlobalHeaders(),
					Cookie: '.ROBLOSECURITY=' + cookie,
					'Roblox-Place-Id': placeID.toString(),
				},
				httpsAgent: new Agent({ rejectUnauthorized: !FFlag['Debug'] }),
			})
				.then(async (res) => {
					FASTLOG3(
						FLog['Auth'],
						'[FLog::Auth] Our cookie check succeeded for user %s - %s (%d), try validate the place ownership and call the resumeFunction()',
						res.data['name'],
						res.data['displayName'],
						res.data['id'],
					);
					const universeId = await UniversesHelper.GetUniverseIDFromPlaceID(placeID);
					Http.request({
						url: BaseURL.ConstructServicePathFromSubDomain(
							'develop',
							'v1/universes/multiget/permissions',
							{ ids: [universeId] },
							true,
							false,
							true,
						),
						method: 'GET',
						headers: {
							...Globals.GlobalHeaders(),
							Cookie: '.ROBLOSECURITY=' + cookie,
							'Roblox-Place-Id': placeID.toString(),
						},
						httpsAgent: new Agent({ rejectUnauthorized: !FFlag['Debug'] }),
					})
						.then((valid) => {
							if (!valid.data['data'][0]['canManage'] && !valid.data['data'][0]['canCloudEdit']) {
								FASTLOG(
									FLog['Auth'],
									'[FLog::Auth] Our Place check failed because the user does not have the valid credentials to manage this place, call the errorFunction().',
								);
								return errorFunction(`You do not have valid permission to manage the place ${placeID}`);
							}
							FASTLOG2(
								FLog['Auth'],
								'[FLog::Auth] Our Place check succeeded for %d (%d), call the resumeFunctiom()',
								placeID,
								universeId,
							);
							return resumeFunction();
						})
						.catch((err) => {
							FASTLOGS(
								FLog['Auth'],
								'[FLog::Auth] Our authentication check failed because %s, most likely due to a credential mis-match, call the errorFunction()',
								err,
							);
							return errorFunction(
								"Cookie isn't valid, validation threw a " +
									(err.response ? err.response.status : 0) +
									' because ' +
									(err.response ? err.response.data['errors'][0]['message'] : 'Connection Hang'),
							);
						});
				})
				.catch((err) => {
					FASTLOGS(
						FLog['Auth'],
						'[FLog::Auth] Our authentication check failed because %s, most likely due to a credential mis-match, call the errorFunction()',
						err,
					);
					return errorFunction(
						"Cookie isn't valid, validation threw a " +
							(err.response ? err.response.status : 0) +
							' because ' +
							(err.response ? err.response.data['errors'][0]['message'] : 'Connection Hang'),
					);
				});
		});
	}

	public static async InitAuthenticatedUser(cookie: string, placeID: number) {
		FASTLOG1(FLog['Auth'], '[FLog::Auth] Trying to authenticate the user with the placeID %i', placeID);
		await AuthenticationHelper.CheckCookieAndPlaceIdInternalAsync(cookie, placeID);
		Globals.Cookie = cookie;
		Globals.PlaceID = placeID;
	}
}
