import filestream from 'fs';

/**
 * @internal
 */
export enum Group {
	'FVariable',
	'FLog',
	'DFLog',
	'SFLog',
	'FFlag',
	'DFFlag',
	'SFFlag',
	'FInt',
	'DFInt',
	'SFInt',
	'FString',
	'DFString',
	'SFString',
	'FPFilter',
	'FSettings',
	'All',
}

/**
 * @internal
 */
export class ClientSettings {
	public static GetSettings<SettingsType extends Group>(
		settingsType: SettingsType,
		settingsGroup: string = 'Client',
	): Record<string, unknown> | string[] | Error {
		try {
			const settings = JSON.parse(
				filestream.readFileSync(
					__dirname + `/../../settings${process.env.DEV_TEST !== undefined ? '.dev.' : '.'}json`,
					'ascii',
				),
			);
			if (settingsType || settingsType === 0 || settingsType === Group.FFlag) {
				switch (settingsType as Group) {
					case Group.FVariable:
						return settings[settingsGroup]['FVariable'];
					case Group.FLog:
						return settings[settingsGroup]['FLog'];
					case Group.DFLog:
						return settings[settingsGroup]['DFLog'];
					case Group.SFLog:
						return settings[settingsGroup]['SFLog'];
					case Group.FFlag:
						return settings[settingsGroup]['FFlag'];
					case Group.DFFlag:
						return settings[settingsGroup]['DFFlag'];
					case Group.SFFlag:
						return settings[settingsGroup]['SFFlag'];
					case Group.FInt:
						return settings[settingsGroup]['FInt'];
					case Group.DFInt:
						return settings[settingsGroup]['DFInt'];
					case Group.SFInt:
						return settings[settingsGroup]['SFInt'];
					case Group.FString:
						return settings[settingsGroup]['FString'];
					case Group.DFString:
						return settings[settingsGroup]['DFString'];
					case Group.SFString:
						return settings[settingsGroup]['SFString'];
					case Group.FPFilter:
						return settings[settingsGroup]['FPFilter'];
					case Group.FSettings:
						return settings['FSettings'];
					case Group.All:
						return settings[settingsGroup];
					default:
						return new Error(`Settings Group '${settingsType}' doesn't exist.`);
				}
			}
		} catch {
			return null;
		}
	}
	public static GetFVariables(ctx: string = 'Client') {
		return ClientSettings.GetSettings(Group.FVariable, ctx);
	}
	public static GetFLogs(ctx: string = 'Client') {
		return ClientSettings.GetSettings(Group.FLog, ctx);
	}
	public static GetDFLogs(ctx: string = 'Client') {
		return ClientSettings.GetSettings(Group.DFLog, ctx);
	}
	public static GetSFLogs(ctx: string = 'Client') {
		return ClientSettings.GetSettings(Group.SFLog, ctx);
	}
	public static GetFFlags(ctx: string = 'Client') {
		return ClientSettings.GetSettings(Group.FFlag, ctx);
	}
	public static GetDFFlags(ctx: string = 'Client') {
		return ClientSettings.GetSettings(Group.DFFlag, ctx);
	}
	public static GetSFFlags(ctx: string = 'Client') {
		return ClientSettings.GetSettings(Group.SFFlag, ctx);
	}
	public static GetFInts(ctx: string = 'Client') {
		return ClientSettings.GetSettings(Group.FInt, ctx);
	}
	public static GetDFInts(ctx: string = 'Client') {
		return ClientSettings.GetSettings(Group.DFInt, ctx);
	}
	public static GetSFInts(ctx: string = 'Client') {
		return ClientSettings.GetSettings(Group.SFInt, ctx);
	}
	public static GetFStrings(ctx: string = 'Client') {
		return ClientSettings.GetSettings(Group.FString, ctx);
	}
	public static GetDFStrings(ctx: string = 'Client') {
		return ClientSettings.GetSettings(Group.DFString, ctx);
	}
	public static GetSFStrings(ctx: string = 'Client') {
		return ClientSettings.GetSettings(Group.SFString, ctx);
	}
	public static GetFPFilters(ctx: string = 'Client') {
		return ClientSettings.GetSettings(Group.FPFilter, ctx);
	}
	public static GetFSettings(ctx: string = 'Client') {
		return ClientSettings.GetSettings(Group.FSettings, ctx);
	}

	public static GetAllSettings(ctx: string = 'Client') {
		return ClientSettings.GetSettings(Group.All, ctx);
	}

	public static GetPlaceIDInPlaceFilter(key: string, placeId: number, ctx: string = 'Client') {
		const FPFilter = ClientSettings.GetFPFilters(ctx);
		// This should never go through unless files.api.sitetest4.robloxlabs.com/ClientSettingsFormatted dies.
		if (FPFilter === undefined) return false;

		const keyFilter = FPFilter[key] as Record<string, unknown>;
		if (keyFilter === undefined) return false;
		let isInFilter = false;
		(<number[]>keyFilter['PlaceIds']).forEach((id) => {
			if (id === placeId) isInFilter = true;
		});
		return isInFilter;
	}
}
