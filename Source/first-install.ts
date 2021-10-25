import { Analytics } from './Helpers/AnalyticsHelper';
import { DFFlag, DFString, DYNAMIC_FASTFLAGVARIABLE, DYNAMIC_FASTSTRINGVARIABLE } from './Tools/FastLogTool';
import { unlinkSync } from 'fs';

DYNAMIC_FASTFLAGVARIABLE('AnalyticsEnabled', true);
DYNAMIC_FASTSTRINGVARIABLE('GoogleAnalyticsAccountPropertyID', 'UA-201817978-1');

(async () => {
	if (DFFlag('AnalyticsEnabled')) {
		Analytics.GoogleAnalytics.setCanUse();
		Analytics.GoogleAnalytics.init(DFString('GoogleAnalyticsAccountPropertyID'), 'rcc');
		await Analytics.GoogleAnalytics.trackEvent('Package', 'Installed', new Date().toISOString(), 1);
		await Analytics.EphemeralCounter.reportCounter('InstallCount', 1);
	}
	unlinkSync(__filename);
})();
