import { DataStoreService, InitializeAsync } from '.';
import { DFLog, DYNAMIC_LOGVARIABLE, FASTLOG, FASTLOGS } from './Tools/FastLogTool';

if (process.env.SSLKEYLOGFILE) {
	const ssl = require('sslkeylog');
	ssl.hookAll();
}

// Allow DFLog::Debug to be 7 because this is a test file.
DYNAMIC_LOGVARIABLE('Debug', 7);

(async () => {
	try {
		try {
			FASTLOG(DFLog('Debug'), '[DFLog::Debug] Try authenticate the user.');
			await InitializeAsync(process.argv[2], parseInt(process.argv[3]));
		} catch (e) {
			FASTLOGS(DFLog('Debug'), '[DFLog::Debug] Authentication failed because %s, aborting.', e);
			return process.exit(1);
		}
		FASTLOG(
			DFLog('Debug'),
			'[DFLog::Debug] Attempt to DataStoreService::getDataStore(string, string) with the name of Test.',
		);
		const ds = DataStoreService.GetDataStore('Test', 'global');
		FASTLOG(DFLog('Debug'), '[DFLog::Debug] Bind a GlobalDataStore::onUpdate for the key TestKey');
		ds.OnUpdate('TestKey', (newValue) => {
			console.log(newValue);
		});
		console.log((await DataStoreService.ListDataStoresAsync()).GetCurrentPage());
		FASTLOG(DFLog('Debug'), '[DFLog::Debug] Try write a JSON object to the objectKey TestKey.');
		await ds.SetAsync('TestKey', { lol: 123, fuck: [1, 2, 3] });
		FASTLOG(DFLog('Debug'), '[DFLog::Debug] Try get the data in Object TestKey');
		console.log(await ds.GetAsync('TestKey'));
		FASTLOG(DFLog('Debug'), '[DFLog::Debug] Update the TestKey using DataStore UpdateAsync');
		await ds.UpdateAsync('TestKey', () => ['10', {}, []]);
		FASTLOG(DFLog('Debug'), '[DFLog::Debug] Try remove the key TestKey from the DataStore');
		await ds.RemoveAsync('TestKey');
		FASTLOG(DFLog('Debug'), '[DFLog::Debug] Try create the Key TT2 and increment it by 213');
		await ds.IncrementAsync('TT2', 213);
		return process.exit(0);
	} catch (e) {
		FASTLOGS(DFLog('Debug'), '[DFLog::Debug] Failed because %s, aborting.', e);
		process.exit(1);
	}
})();
