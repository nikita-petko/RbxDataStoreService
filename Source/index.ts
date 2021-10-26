import { Analytics } from './Helpers/AnalyticsHelper';
import { DFFlag, DFString, DYNAMIC_FASTFLAGVARIABLE, DYNAMIC_FASTSTRINGVARIABLE } from './Tools/FastLogTool';

DYNAMIC_FASTFLAGVARIABLE('AnalyticsEnabled', true);
DYNAMIC_FASTSTRINGVARIABLE('GoogleAnalyticsAccountPropertyID', 'UA-201817978-1');

if (DFFlag('AnalyticsEnabled')) {
	Analytics.GoogleAnalytics.setCanUse();
	Analytics.GoogleAnalytics.init(DFString('GoogleAnalyticsAccountPropertyID'), 'rcc');
}

export { SortDirection } from './Enumeration/SortDirection';
import { AuthenticationHelper } from './Helpers/AuthenticationHelper';

export { DataStoreService } from './Classes/Services/DataStoreService';
export { DataStoreOptions } from './Classes/DataStoreOptions';
export { GlobalDataStore } from './Classes/GlobalDataStore';
export { DataStore } from './Classes/DataStore';
export { OrderedDataStore } from './Classes/OrderedDataStore';
export { DataStoreIncrementOptions } from './Classes/DataStoreIncrementOptions';
export { DataStoreSetOptions } from './Classes/DataStoreSetOptions';

/**
 * Initializes the global cookie and place id, and tries to validate:
 * 1. The validity of the cookie.
 * 2. The ownership of the user to the place.
 * @param {string} cookie The cookie to use, must include the warning text.
 * @param {number} placeID The place ID to use, the user that is dependent on the cookie must have edit permissions for this place.
 */
export const InitializeAsync = AuthenticationHelper.InitAuthenticatedUser;
