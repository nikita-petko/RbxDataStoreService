import { HttpRequest } from '../Classes/HttpRequest';
import { BaseURL } from '../Tools/UrlTool';
import { Globals } from '../Util/Globals';

/**
 * @internal
 */
export class UniversesHelper {
	public static async GetUniverseIDFromPlaceID(placeID: number): Promise<number> {
		return new Promise<number>((resumeFunction, errorFunction) => {
			const request = new HttpRequest();
			request.method = 'GET';
			request.url = BaseURL.ConstructServicePathFromSubDomain(
				'api',
				'universes/get-universe-containing-place',
				{ placeId: placeID },
				true,
				false,
				true,
			);
			request
				.execute(null)
				.then((response) => {
					if (response.data['UniverseId'] !== undefined) {
						Globals.UniverseID = response.data['UniverseId'];
						return resumeFunction(response.data['UniverseId']);
					}
					return errorFunction();
				})
				.catch((error) => {
					errorFunction(error.message);
				});
		});
	}
}
