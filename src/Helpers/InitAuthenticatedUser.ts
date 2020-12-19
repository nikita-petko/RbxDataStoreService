import { checkCookieAndPlaceIdInternalAsync } from './Internal/checkCookieAndPlaceIdInternalAsync';
import { globals } from '../util/globals';

export const init = async (cookie: string, placeId: number) => {
	await checkCookieAndPlaceIdInternalAsync(cookie, placeId);
	globals.cookie = cookie;
	globals.placeId = placeId;
};
