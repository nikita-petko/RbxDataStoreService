import { DataStoreService, InitializeAsync } from '.';
import ssl from 'sslkeylog';
import { DFLog, DYNAMIC_LOGVARIABLE, FASTLOG, FASTLOGS } from './Tools/FastLogTool';
ssl.hookAll();

// Allow DFLog::Debug to be 7 because this is a test file.
DYNAMIC_LOGVARIABLE('Debug', 7);

(async () => {
	try {
		FASTLOG(DFLog['Debug'], '[DFLog::Debug] Try authenticate the user.');
		await InitializeAsync(process.argv[2], parseInt(process.argv[3]));
	} catch (e) {
		FASTLOGS(DFLog['Debug'], '[DFLog::Debug] Authentication failed because %s, aborting.', e);
		return process.exit(1);
	}
	FASTLOG(
		DFLog['Debug'],
		'[DFLog::Debug] Attempt to DataStoreService::getDataStore(string, string) with the name of Test.',
	);
	const DataStore = DataStoreService.GetDataStore('Test');
	FASTLOG(DFLog['Debug'], '[DFLog::Debug] Bind a GlobalDataStore::onUpdate for the key TestKey');
	DataStore.OnUpdate('TestKey', (newValue) => {
		console.log(newValue);
	});
	FASTLOG(DFLog['Debug'], '[DFLog::Debug] Try write a JSON object to the objectKey TestKey.');
	await DataStore.SetAsync('TestKey', { test: 1 });
	FASTLOG(DFLog['Debug'], '[DFLog::Debug] Try get the data in Object TestKey');
	console.log(await DataStore.GetAsync('TestKey'));
	FASTLOG(DFLog['Debug'], '[DFLog::Debug] Try remove the key TestKey from the DataStore');
	await DataStore.RemoveAsync('TestKey');
	FASTLOG(DFLog['Debug'], '[DFLog::Debug] Try create the Key TT and increment it by 213');
	await DataStore.IncrementAsync('TT', 213);
	return process.exit(0);
})();
