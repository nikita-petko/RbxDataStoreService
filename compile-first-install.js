const { existsSync, statSync, readFileSync } = require('fs');
const { unlink, copyFile, rm } = require('fs/promises');
const { execSync } = require('child_process');
const { release } = require('os');

function hasDockerEnv() {
	try {
		statSync('/.dockerenv');
		return true;
	} catch (_) {
		return false;
	}
}

function hasDockerCGroup() {
	try {
		return readFileSync('/proc/self/cgroup', 'utf8').includes('docker');
	} catch (_) {
		return false;
	}
}

function isDocker() {
	return hasDockerEnv() || hasDockerCGroup();
}

function isWsl() {
	if (process.platform !== 'linux') {
		return false;
	}

	if (release().toLowerCase().includes('microsoft')) {
		if (isDocker()) {
			return false;
		}

		return true;
	}

	try {
		return readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft') ? !isDocker() : false;
	} catch (_) {
		return false;
	}
}

console.log(`Compiling installer on platform '${process.platform}' in directory '${__dirname}' at '${new Date()}'`);

if (__dirname?.match(/\/mnt\/[A-Za-z]\//gi) != null && isWsl()) {
	console.error(`Unable to compile installer in cwd '${__dirname}' (you are running on a windows volume under wsl)`);
	return process.exit(1);
}

function execSyncSafe(command) {
	try {
		execSync(command, { encoding: 'utf-8', stdio: 'inherit', stderr: 'ignore' });
		return true;
	} catch (_) {
		return false;
	}
}

function commandExists(commandName) {
	if (process.platform === 'win32') return execSyncSafe(`where ${commandName.trim()}`);

	return execSyncSafe(`command -v ${commandName.trim()}`);
}

function cwd(path) {
	const thisDir = __dirname;
	if (process.platform !== 'win32') path = path?.replace(/\\/g, '/');
	else path = path?.replace(/\//g, '\\');

	if (!path?.startsWith(process.platform === 'win32' ? '\\' : '/'))
		path = process.platform === 'win32' ? '\\' + path : '/' + path;

	return thisDir + path;
}

const firstInstallPath = cwd('first-install.js');

(async () => {
	console.log("Checking if we have the compiler 'ncc'.");
	// Step 1. Do we have the compiler?
	if (!commandExists('ncc')) {
		console.log("Could not find compiler 'ncc', try installing it.");
		// if not try install it.
		if (!commandExists('npm')) {
			console.error('Unable to find npm.');
			return process.exit(1);
		}

		if (!execSyncSafe('npm i -g @vercel/ncc')) {
			console.error('Unable to install compiler.');
			return process.exit(1);
		}

		console.log("Sucessfully installed compiler 'ncc'!");
	} else {
		console.log("We have the compiler 'ncc'.");
	}

	// Step 1. Delete if already exists
	console.log(`Checking if first-install.js exists at path '${firstInstallPath}'...`);
	if (existsSync(firstInstallPath)) {
		console.log(`first-install.js existed at path '${firstInstallPath}', delete it...`);
		await unlink(firstInstallPath);
	}

	// Step 2. Run compiler command
	console.log('Run compiler command...');
	const srcFile = cwd('Source/first-install.ts');
	console.log(`Check if first-install.ts exists at path '${srcFile}'...`);
	if (!existsSync(srcFile)) {
		console.error(`Unable to find source file at path '${srcFile}'`);
		return process.exit(1);
	}
	console.log(`first-install.ts exists at path '${srcFile}'!`);

	const outputDir = cwd('first-install-output');

	const commandText = `ncc build "${srcFile}" -m -o "${outputDir}"`;
	console.log(`Executing compiler command with command text '${commandText}'...`);
	if (!execSyncSafe(commandText)) {
		console.error('Unable to run compiler command due to an error.');
		return process.exit(1);
	}
	console.log('Successfully compiled source file!');

	// Step 3. Move the output to cwd.
	console.log('Moving compiler output to current working directory...');
	const outputFileName = cwd('first-install-output/index.js');
	console.log(`Checking if output exists at path '${outputFileName}'...`);
	if (!existsSync(outputFileName)) {
		console.error("Compile shallow failed because the output didn't exist at the target directory.");
		return process.exit(1);
	}
	console.log(`Output exists at path '${outputFileName}'!`);

	await copyFile(outputFileName, cwd('first-install.js'));
	console.log('Sucessfully moved compiler output to current working directory!');

	// Final Step: clean up.
	console.log('Running cleanup...');
	await rm(outputDir, { recursive: true, force: true });
	console.log('Sucessfully cleaned up cwd!');

	console.log('Sucessfully deployed first-install bootstrapper!');
})();
