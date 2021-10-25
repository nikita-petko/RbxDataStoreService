const { unlinkSync } = require('fs');

function cwd(path) {
	const thisDir = __dirname;
	if (process.platform !== 'win32') path = path?.replace(/\\/g, '/');
	else path = path?.replace(/\//g, '\\');

	if (!path?.startsWith(process.platform === 'win32' ? '\\' : '/'))
		path = process.platform === 'win32' ? '\\' + path : '/' + path;

	return thisDir + path;
}

const firstInstallArtifact = cwd('first-install.js');

console.log(`Removing first-install.js at path '${firstInstallArtifact}'.`);
unlinkSync(firstInstallArtifact);
console.log('Sucessfully cleaned up publish artifacts.');
