import { FFlag, DFString, DYNAMIC_FASTSTRINGVARIABLE, FASTFLAG, FASTFLAGVARIABLE } from './FastLogTool';
import qs from 'querystring';

FASTFLAGVARIABLE('UseSiteTests', false);
FASTFLAG('Debug');
DYNAMIC_FASTSTRINGVARIABLE('PreferredTestSite', 'SiteTest1');

export class BaseURL {
	/**
	 * Comes from Roblox.Common.Client.BaseURL (BaseUrl.cs) {M:Roblox.Common.Client.BaseURL.GetBaseURL(System.Nullable`1)}
	 * Gets the UnsecureBaseURL from {Roblox.Common.Client.Urls}
	 * @param {boolean?} preferApex Should this use the apexDomain over the baseUrl?
	 * @returns {string} Returns a string
	 */
	public static GetBaseURL(preferApex: boolean = false): string {
		return BaseURL.GetSecureBaseURL(preferApex).replace('https://', 'http://');
	}

	/**
	 * Comes from Roblox.Common.Client.BaseURL (BaseUrl.cs) {M:Roblox.Common.Client.BaseURL.GetSecureBaseURL(System.Nullable`1)}
	 * Gets the SecureBaseURL from {Roblox.Common.Client.Urls}
	 * @param {boolean?} preferApex Should this use the apexDomain over the baseUrl?
	 * @returns {string} Returns a string
	 */
	public static GetSecureBaseURL(preferApex: boolean = false): string {
		return `https://${
			FFlag['Debug'] && FFlag['UseSiteTests']
				? GlobalURLS.TestSites[DFString('PreferredTestSite') ? DFString('PreferredTestSite') : 'SiteTest1'][
						preferApex ? 'Apex' : 'BaseUrl'
				  ]
				: GlobalURLS.Production[preferApex ? 'Apex' : 'BaseUrl']
		}`;
	}

	/**
	 * Comes from Roblox.Common.Client.BaseURL (BaseUrl.cs) {M:Roblox.Common.Client.BaseURL.GetBaseHost(System.Nullable`1)}
	 * Gets the BaseHost from {Roblox.Common.Client.Urls}
	 * @param {boolean?} preferApex Should this use the apexDomain over the baseUrl?
	 * @returns {string} Returns a string
	 */
	public static GetBaseHost(preferApex: boolean = false): string {
		return `${
			FFlag['Debug'] && FFlag['UseSiteTests']
				? GlobalURLS.TestSites[DFString('PreferredTestSite') ? DFString('PreferredTestSite') : 'SiteTest1'][
						preferApex ? 'Apex' : 'BaseUrl'
				  ]
				: GlobalURLS.Production[preferApex ? 'Apex' : 'BaseUrl']
		}`;
	}

	/**
	 * Comes from Roblox.Common.Client.BaseURL (BaseUrl.cs) {M:Roblox.Common.Client.BaseURL.ConstructServicePathFromSubDomain(System.String,System.Nullable`1,System.Nullable`1,System.Nullable`1,System.Nullable`1)}
	 * Construct a serviceUri from the given parameters.
	 * @param {string} subDomain Depending on if {preferApex} is set, this will construct the same url but with different times.
	 * @param {string} servicePath A service path to be parsed and trimmed of trailing slashes if {trimTrailingSlashes} is set.
	 * @param {Record<string, any>} queryParameters A {System.Collections.Generic.ICollection`2} of query parameters.
	 * @param {boolean} fetchSecureBaseUri Determines if the baseUri should start with https (true) or http (false/null)
	 * @param {boolean} preferApex Determines if the ApexDomain is used over the baseUrl.
	 * @param {boolean} trimTrailingSlashes Should it trim trailing slashes away from the servicePath
	 * @returns {string} Returns string
	 */
	public static ConstructServicePathFromSubDomain(
		subDomain: string,
		servicePath: string = '/',
		queryParameters: Record<string, any> = null,
		fetchSecureBaseUri: boolean = true,
		preferApex: boolean = false,
		trimTrailingSlashes: boolean = true,
	): string {
		const baseUrl = fetchSecureBaseUri ? BaseURL.GetSecureBaseURL(preferApex) : BaseURL.GetBaseURL(preferApex);
		let uri: string = '';

		let path = `${!servicePath.startsWith('/') ? `/${servicePath}` : servicePath}`;

		path = trimTrailingSlashes ? BaseURL.trim_trailing_slashes(path) : path;

		if (preferApex) {
			uri = `${subDomain}.${baseUrl}${path}`;
		} else {
			uri = `${BaseURL.replace_top_subdomain(baseUrl, subDomain)}${path}`;
		}

		if (queryParameters) {
			uri += `?${qs.stringify(queryParameters)}`;
		}

		return uri;
	}

	/**
	 * Comes from Roblox.Common.Client.BaseURL (BaseUrl.cs) {M:Roblox.Common.Client.BaseURL.ConstructServicePathFromHost(System.String,System.Nullable`1,System.Nullable`1,System.Nullable`1,System.Nullable`1)}
	 * Construct a serviceUri from the given parameters.
	 * @param {string} hostName The host to construct with.
	 * @param {string} servicePath A service path to be parsed and trimmed of trailing slashes if {trimTrailingSlashes} is set.
	 * @param {Record<string, any>} queryParameters A {System.Collections.Generic.ICollection`2} of query parameters.
	 * @param {boolean} fetchSecureBaseUri Determines if the baseUri should start with https (true) or http (false/null)
	 * @param {boolean} trimTrailingSlashes Should it trim trailing slashes away from the servicePath
	 * @returns {string} Returns string
	 */
	public static ConstructServicePathFromHost(
		hostName: string,
		servicePath: string = '/',
		queryParameters: Record<string, any> = null,
		fetchSecureBaseUri: boolean = true,
		trimTrailingSlashes: boolean = true,
	): string {
		const baseUrl = fetchSecureBaseUri
			? hostName.startsWith('http://')
				? hostName.replace('http://', 'https://')
				: `https://${hostName}`
			: hostName.startsWith('https://')
			? hostName.replace('https://', 'http://')
			: `http://${hostName}`;

		let path = `${!servicePath.startsWith('/') ? `/${servicePath}` : servicePath}`;
		path = trimTrailingSlashes ? BaseURL.trim_trailing_slashes(path) : path;

		let uri: string = `${baseUrl}${path}`;

		if (queryParameters) {
			uri += `?${qs.stringify(queryParameters)}`;
		}

		return uri;
	}

	/**
	 * @internal
	 */
	private static trim_trailing_slashes(str: string) {
		return str.replace(/\/$/, '');
	}

	/**
	 * @internal
	 */
	private static replace_top_subdomain(str: string, rep: string) {
		return str.replace(/www/, rep);
	}
}

export class UrlHelper {
	public static GetRobloxGamePersistenceHost() {
		return UrlHelper.GetRobloxServiceHost('gamepersistence');
	}

	public static GetRobloxServiceHost(sub: string) {
		return `${sub}.${UrlHelper.GetBaseHost()}`;
	}

	public static GetBaseHost() {
		return BaseURL.GetBaseHost(true);
	}
}

export const GlobalURLS = {
	Production: {
		Apex: 'roblox.com',
		BaseUrl: 'www.roblox.com',
	},
	TestSites: {
		Apex: 'robloxlabs.com',
		SiteTest1: {
			Apex: `sitetest1.robloxlabs.com`,
			BaseUrl: `www.sitetest1.robloxlabs.com`,
		},
		SiteTest2: {
			Apex: `sitetest2.robloxlabs.com`,
			BaseUrl: `www.sitetest2.robloxlabs.com`,
		},
		SiteTest3: {
			Apex: `sitetest3.robloxlabs.com`,
			BaseUrl: `www.sitetest3.robloxlabs.com`,
		},
		SiteTest4: {
			Apex: `sitetest4.robloxlabs.com`,
			BaseUrl: `www.sitetest4.robloxlabs.com`,
		},
	},
};
