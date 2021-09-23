import assert from 'assert';
import { HttpRequest } from '../Classes/HttpRequest';
import {
	DFFlag,
	DFLog,
	DYNAMIC_FASTFLAG,
	DYNAMIC_FASTFLAGVARIABLE,
	DYNAMIC_LOGVARIABLE,
	FASTFLAGVARIABLE,
	FASTLOG,
	FASTLOGS,
	FFlag,
} from '../Tools/FastLogTool';
import { BaseURL, UrlHelper } from '../Tools/UrlTool';
import { Globals } from '../Util/Globals';
import { Http } from './HttpHelper';
import { readFileSync, writeFileSync } from 'fs';

DYNAMIC_LOGVARIABLE('AnalyticsLog', 7);

// google analytics
DYNAMIC_LOGVARIABLE('GoogleAnalyticsTracking', 7);
FASTFLAGVARIABLE('GoogleAnalyticsTrackingEnabled', true);
FASTFLAGVARIABLE('DebugAnalyticsForceLotteryWin', false);
DYNAMIC_FASTFLAGVARIABLE('RobloxAnalyticsTrackingEnabled', true);
DYNAMIC_FASTFLAGVARIABLE('DebugAnalyticsSendUserId', false);
FASTFLAGVARIABLE('SendStudioEventsWithStudioSID', false);
FASTFLAGVARIABLE('UseBuildGenericGameUrl', true);
DYNAMIC_FASTFLAGVARIABLE('CloseOnAnalyticsAttemptToUseBeforeInitialization', true);
DYNAMIC_FASTFLAG('AnalyticsEnabled');

/**
 * @internal
 */
async function httpHandler(url: string, params: string, optionalContentType: string, isGet: boolean) {
	const fullUrl = isGet ? (params !== undefined ? `${url}?${params}` : url) : url;

	const http = new HttpRequest();

	http.url = fullUrl;

	http.method = isGet ? 'GET' : undefined;

	if (!isGet) {
		http.postData = params;
	}

	try {
		await http.execute(null);
	} catch (ex) {
		FASTLOGS(DFLog('AnalyticsLog'), '[DFLog::AnalyticsLog] Exception in analytics httpHandler: %s', ex.message);
	}
}

/**
 * @internal
 */
export namespace Analytics {
	/**
	 * @internal
	 */
	export const staticmembers = {
		appVersion: null,
		reporter: null,
		location: null,
		userId: null,
		placeId: null,
	};

	function sanitizeParam(p: string): string {
		const result = p;
		result.split(', ').join('');
		return result;
	}

	export function setUserId(userId: number) {
		staticmembers.userId = userId.toString();
	}

	export function setPlaceId(placeid: number) {
		staticmembers.placeId = placeid.toString();
	}

	export function setAppVersion(appVersion: string) {
		staticmembers.appVersion = sanitizeParam(appVersion);
	}

	export function setLocation(loc: string) {
		staticmembers.location = sanitizeParam(loc);
	}

	export function setResporter(rep: string) {
		staticmembers.reporter = sanitizeParam(rep);
	}

	export namespace EphemeralCounter {
		const countersApiKey: string = '76E5A40C-3AE1-4028-9F10-7C62520BD94F';

		export async function reportStats(category: string, value: number) {
			if (DFFlag('AnalyticsEnabled')) {
				let baseUrl = BaseURL.GetBaseURL();

				const valueStr = value.toString();

				let url: string;

				if (FFlag['UseBuildGenericGameUrl']) {
					url = UrlHelper.BuildGenericGameUrl(
						`game/report-stats?name=${encodeURIComponent(category)}&value=${encodeURIComponent(valueStr)}`,
					);
				} else {
					url = `${baseUrl}/game/report-stats?name=${encodeURIComponent(category)}&value=${encodeURIComponent(
						valueStr,
					)}`;
				}

				await httpHandler(url, '', Http.kContentTypeUrlEncoded, false);
			}
		}

		export async function reportCountersCSV(counterNamesCSV: string) {
			if (DFFlag('AnalyticsEnabled')) {
				const counterUrl = UrlHelper.GetCountersMultiIncrementUrl(countersApiKey);

				const data = 'counterNamesCsv=' + counterNamesCSV;

				await httpHandler(counterUrl, data, Http.kContentTypeUrlEncoded, false);
			}
		}

		export async function reportCounter(counterName: string, amount: number) {
			if (DFFlag('AnalyticsEnabled')) {
				const counterUrl = UrlHelper.GetCountersUrl(countersApiKey);

				const url = `${counterUrl}&counterName=${counterName}&amount=${amount}`;

				await httpHandler(url, '', Http.kContentTypeUrlEncoded, false);
			}
		}
	}

	export namespace GoogleAnalytics {
		let initialized = false;
		let canUseGA = false;
		let canUserRobloxEvents = false;
		let googleClientID: string;
		let googleAccountPropertyID: string;
		let robloxProductName: string;

		let atteptedToUseBeforeInit = false;

		function generateClientID() {
			return Globals.GenerateUUID4();
		}

		function googleCollectionParams(hitType: string) {
			return `v=1&tid=${googleAccountPropertyID}&cid=${googleClientID}&t=${hitType}${
				DFFlag('DebugAnalyticsSendUserId') && Globals.UserID !== 0 ? `&userId=${Globals.UserID}` : ''
			}`;
		}

		export function init(accountPropertyID: string, productName: string) {
			if (atteptedToUseBeforeInit) {
				FASTLOG(DFLog('AnalyticsLog'), '[DFLog::AnalyticsLog] Attempted to report analyics before init.');
				if (DFFlag('CloseOnAnalyticsAttemptToUseBeforeInitialization')) {
					process.exit(1);
				}
			}

			if (initialized) {
				FASTLOGS(
					DFLog['GoogleAnalyticsTracking'],
					'[DFLog::GoogleAnalyticsTracking] %s',
					'Google analytics already initialized!',
				);
				return;
			}

			robloxProductName = productName;

			googleAccountPropertyID = accountPropertyID;
			assert(googleAccountPropertyID.length > 0);
			let clientId: string | Buffer;
			try {
				clientId = readFileSync('./clientid.txt', 'utf-8');
			} catch {
				clientId = generateClientID();
				writeFileSync('./clientid.txt', clientId);
			}

			googleClientID = clientId;
			assert(googleClientID.length > 0);

			initialized = true;
		}

		export function getCanUse() {
			return canUseGA || canUserRobloxEvents;
		}

		export function setCanUse() {
			canUseGA = true;
			canUserRobloxEvents = true;
		}

		async function sendEventGA(category: string, action: string, label: string, value: number) {
			const params = `${googleCollectionParams('event')}&ec=${category}&ea=${action}&ev=${value}&el=${label}`;

			await httpHandler(Http.kGoogleAnalyticsBaseURL, params, Http.kContentTypeDefaultUnspecified, false);
		}

		async function sendEventRoblox(category: string, action: string, label: string, value: number) {
			if (!initialized) {
				atteptedToUseBeforeInit = true;
				return;
			}

			if (DFFlag('RobloxAnalyticsTrackingEnabled') && robloxProductName !== '') {
				await httpHandler(
					BaseURL.ConstructServicePathFromSubDomain(
						'ecsv2',
						`${robloxProductName}/e.png`,
						{ sessionId: googleClientID, userID: Globals.UserID, category, evt: action, label, value },
						true,
						false,
						true,
					),
					undefined,
					Http.kContentTypeDefaultUnspecified,
					true,
				);
			}
		}

		export async function trackEvent(category: string, action: string, label: string, value: number) {
			if (!initialized) {
				atteptedToUseBeforeInit = true;
				return;
			}

			if (canUseGA) {
				await sendEventGA(category, action, label, value);
			}

			if (canUserRobloxEvents) {
				await sendEventRoblox(category, action, label, value);
			}
		}

		export async function trackEventWithoutThrottling(
			category: string,
			action: string,
			label: string,
			value: number,
		) {
			if (!initialized) {
				atteptedToUseBeforeInit = true;
				return;
			}

			await sendEventGA(category, action, label, value);
			await sendEventRoblox(category, action, label, value);
		}

		export async function trackUserTiming(category: string, variable: string, milliseconds: number, label: string) {
			if (!initialized || !canUseGA) {
				return;
			}

			const params = `${googleCollectionParams(
				'timing',
			)}&utc=${category}&utv=${variable}&utt=${milliseconds}&utl=${label}`;

			httpHandler(Http.kGoogleAnalyticsBaseURL, params, Http.kContentTypeDefaultUnspecified, false);
		}
	}
}
