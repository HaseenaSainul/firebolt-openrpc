import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');

var dstPath = process.env.NODE_INSTALL_PATH;
var name = process.env.NATIVE_LIB_NAME;
var versionStr = process.env.NATIVE_LIB_VERSION;
var version = versionStr.split(".");

var libName = 'lib' + name + '.so.' + version[0] + '.' + version[1] + '.' + version[2];
var linkName = 'lib' + name + '.so.' + version[0];

var srcPath = 'src/native/sdk/build/'
var buildType = 'Release/';
createDir(dstPath + '/usr/lib/pkgconfig');
createDir(dstPath + '/etc');

copyFile(srcPath + 'Source/' + 'FireboltSDK.pc', dstPath + '/usr/lib/pkgconfig/FireboltSDK.pc');
copyFile(srcPath + 'Source/' + 'config/FireboltSDK.json', dstPath + '/etc/FireboltSDK.json');
copyFile(srcPath + buildType + libName, dstPath + '/usr/lib/' + libName);

createFileLink(libName, dstPath + '/usr/lib/' + linkName);
createFileLink(linkName, dstPath + '/usr/lib/libFireboltSDK.so');

function copyFile(src, dst) {
    fs.copyFileSync(src, dst);
    console.log(src + ' is copied to ' + dst);
}

function createFileLink(src, dst) {
    if (fs.existsSync(dst)) {
       fs.unlinkSync(dst);
    }
    fs.symlinkSync(src, dst);
    console.log(src + ' symlink is created to ' + dst);
}

function createDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('Directory ' + dir + ' is created.')
    }
}
