import { hostname } from 'os';

/**
 * @internal
 */
export class Globals {
	public static Cookie: string = '';
	public static PlaceID: number = 0;
	public static UniverseID: number = 0;
	public static UserID: number = 0;

	public static GlobalHeaders() {
		return {
			'Cache-Control': 'no-cache',
			Cookie: '.ROBLOSECURITY=' + Globals.Cookie,
			'Content-Type': 'application/x-www-form-urlencoded',
			'Roblox-Place-Id': Globals.PlaceID.toString(),
			'Roblox-Universe-Id': Globals.UniverseID.toString(),
			'Roblox-Machine-Id': hostname(),
			Requester: 'Server',
			'Roblox-DataCenter-Id': Math.floor(Math.random() * (500 - 150 + 1) + 150),
			'Roblox-Job-Signature': Globals.GenerateUUID4(),
			'User-Agent': `Roblox/${process.platform === 'linux' ? 'Linux' : 'WinInet'}`,
		};
	}

	public static GenerateUUID4() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			var r = (Math.random() * 16) | 0,
				v = c == 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}
}
