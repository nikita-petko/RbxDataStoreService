import { HttpRequest } from './HttpRequest';
import { Globals } from '../Util/Globals';
import { BaseURL } from '../Tools/UrlTool';

export class LuaWebService {
	/**
	 * @internal
	 */
	private checkApiAccess: boolean;
	/**
	 * @internal
	 */
	private timeToRecheckApiAccess: Date;
	/**
	 * @internal
	 */
	private apiAccess: boolean;

	public constructor() {
		this.checkApiAccess = true;
	}

	public async IsApiAccessEnabled() {
		if (this.checkApiAccess) {
			if (this.apiAccess !== undefined || this.timeToRecheckApiAccess !== new Date(Date.now())) {
				const request = new HttpRequest();

				request.doNotParse = true;

				request.method = 'GET';

				request.url = BaseURL.ConstructServicePathFromSubDomain(
					'api',
					'universes/get-info',
					{ placeId: Globals.PlaceID },
					true,
					false,
					true,
				);
				let response;
				try {
					response = await request.execute(null);
				} catch {}

				let ableToParse = false;
				let parsedValue = false;

				if (!((<string>response).length === 0)) {
					try {
						const v = new Map(Object.entries(JSON.parse(response)));

						const itr = v.get('StudioAccessToApisAllowed');

						if (itr !== undefined && typeof itr === 'boolean') {
							ableToParse = true;

							parsedValue = itr;
						}
					} catch {}
				}
				this.apiAccess = ableToParse && parsedValue;
				this.timeToRecheckApiAccess = new Date(Date.now());
			}
			return this.apiAccess;
		} else {
			return true;
		}
	}
}
