export class Globals {
	public static Cookie: string = '';
	public static PlaceID: number = 0;
	public static UniverseID: number = 0;

	public static GlobalHeaders() {
		return {
			'Cache-Control': 'no-cache',
			Cookie: '.ROBLOSECURITY=' + Globals.Cookie,
			'Content-Type': 'application/x-www-form-urlencoded',
			'Roblox-Place-Id': Globals.PlaceID.toString(),
			'Roblox-Universe-Id': Globals.UniverseID.toString(),
			'User-Agent': 'RobloxInternal/WinInet',
		};
	}
}
