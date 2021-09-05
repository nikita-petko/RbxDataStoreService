import { HttpRequest } from '../Classes/HttpRequest';
import {
	DFLog,
	DYNAMIC_FASTFLAG,
	DYNAMIC_FASTFLAGVARIABLE,
	DYNAMIC_FASTSTRING,
	DYNAMIC_LOGGROUP,
	DYNAMIC_LOGVARIABLE,
	FASTFLAG,
	FASTLOGS,
	FFlag,
} from '../Tools/FastLogTool';
import { BaseURL, UrlHelper } from '../Tools/UrlTool';
import { Http } from './HttpHelper';

DYNAMIC_LOGVARIABLE('AnalyticsLog', 0);

// google analytics
DYNAMIC_LOGGROUP('GoogleAnalyticsTracking');
FASTFLAG('GoogleAnalyticsTrackingEnabled');
FASTFLAG('DebugAnalyticsForceLotteryWin');
DYNAMIC_FASTSTRING('RobloxAnalyticsURL');
DYNAMIC_FASTFLAG('RobloxAnalyticsTrackingEnabled');
DYNAMIC_FASTFLAG('DebugAnalyticsSendUserId');
FASTFLAG('SendStudioEventsWithStudioSID');
FASTFLAG('UseBuildGenericGameUrl');

// influx
DYNAMIC_FASTSTRING('HttpInfluxURL');
DYNAMIC_FASTSTRING('HttpInfluxDatabase');
DYNAMIC_FASTSTRING('HttpInfluxUser');
DYNAMIC_FASTSTRING('HttpInfluxPassword');
DYNAMIC_FASTFLAGVARIABLE('InfluxDb09Enabled', false);

/**
 * @internal
 */
async function httpHandler(url: string, params: string, optionalContentType: string, isGet: boolean) {
	const fullUrl = isGet ? `${url}?${params}` : url;

	const http = new HttpRequest();

	http.url = fullUrl;

	http.method = isGet ? 'GET' : 'POST';

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

		export async function reportCountersCSV(counterNamesCSV: string) {
			const counterUrl = UrlHelper.GetCountersMultiIncrementUrl(countersApiKey);

			const data = 'counterNamesCsv=' + counterNamesCSV;

			await httpHandler(counterUrl, data, Http.kContentTypeUrlEncoded, false);
		}

		export async function reportCounter(counterName: string, amount: number) {
			const counterUrl = UrlHelper.GetCountersUrl(countersApiKey);

			const url = `${counterUrl}&counterName=${counterName}&amount=${amount}`;

			await httpHandler(url, '', Http.kContentTypeUrlEncoded, false);
		}
	}

	export namespace GoogleAnalytics {
		// let initialized = false;
		// let canUseGA = false;
		// let canUserRobloxEvents = false;
		// let googleClientID;
		// let googleAccountPropertyID;
		// let robloxProductName;
		// let experimentString;
		// let robloxSessionKey;

		// let atteptedToUseBeforeInit = false;

		export function generateClientID() {}
	}
}
