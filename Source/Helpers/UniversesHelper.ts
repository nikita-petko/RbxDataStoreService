import { HttpRequest } from '../Classes/HttpRequest';
import { BaseURL } from '../Tools/UrlTool';
import { Globals } from '../Util/Globals';

/**
 * @internal
 */
export class UniversesHelper {
	public static async GetUniverseIDFromPlaceID(placeID: number): Promise<number> {
		return new Promise((resumeFunction, errorFunction) => {
			const request = new HttpRequest();
			request.method = 'GET';
			request.url = BaseURL.ConstructServicePathFromSubDomain(
				'develop',
				`v2/places/${placeID}`,
				{},
				true,
				false,
				true,
			);
			request
				.execute(null)
				.then((response) => {
					if (response.data['universeId'] !== undefined) {
						Globals.UniverseID = response.data['universeId'];
						return resumeFunction(response.data['universeId']);
					}
					return errorFunction();
				})
				.catch((error) => {
					errorFunction(`Failed to get universe ID from place ID: ${error}`);
				});
		});
	}
}
