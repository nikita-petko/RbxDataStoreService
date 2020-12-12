//C:\Users\Padraig\Git\RbxDataStoreService\src\Helpers\Internal\checkCookieAndPlaceIdInternalAsync.ts
//C:\Users\Padraig\Git\RbxDataStoreService\src\Helpers\InitAuthenticatedUser.ts
import { cookieWarningCapture } from '../../util/constants';
import r from 'request-promise';

export const checkCookieAndPlaceIdInternalAsync = (cookie: string, placeId: number): Promise<void> => {
	return new Promise((resolve: (value: PromiseLike<void> | void) => void, reject: (reason?: any) => void) => {
		if (cookie.length === 0) return reject("Cookie name can't be empty");
		if (placeId < 1) return reject('The placeId is required to at least be >1');
		if (!cookie.match(cookieWarningCapture))
			return reject("Cookie isn't valid, it requires the warning text to persistent");
		r('https://users.roblox.com/v1/users/authenticated', {
			method: 'GET',
			headers: { Cookie: '.ROBLOSECURITY=' + cookie },
			resolveWithFullResponse: true,
		})
			.catch((err) => {
				if (err.statusCode === 401) return reject("Cookie isn't valid, it threw a 401");
				else return reject(err.message);
			})
			.then(() => resolve());
	});
};
