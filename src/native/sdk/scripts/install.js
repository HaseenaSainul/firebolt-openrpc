import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const readdir = require('fs/promises');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');

var dstPath = process.env.NODE_INSTALL_PATH;
var fireboltTarget = process.env.NATIVE_LIB_NAME;
var versionStr = process.env.NATIVE_LIB_VERSION;

var buildPath = 'src/native/sdk/build/';
var buildType = 'Release/';
var includePath = 'src/native/sdk/Source';

// Install config files
installFiles(buildPath + 'Source/', dstPath + '/usr/lib/pkgconfig/', ".pc");
installFiles(buildPath + 'Source/', dstPath + '/usr/lib/cmake/' + fireboltTarget, ".cmake", "Config");
installFiles(buildPath + 'Source/CMakeFiles/Export/lib/cmake/' + fireboltTarget, dstPath + '/usr/lib/cmake/' + fireboltTarget, ".cmake", "Targets");
installFiles(buildPath + 'Source/config', dstPath + '/etc/', ".json");

//installFiles(includePath + 

installLibraries(buildPath + buildType, dstPath + '/usr/lib/', versionStr);

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

function copyFiles(src, dst) {
  fse.copySync(src, dst, { overwrite: true|false })
  console.log(src + ' is copied to ' + dst);
}

function getExtension(fileName) {
    return fileName.substring(fileName.indexOf('.')); 
}

function getName(fileName) {
    var	fileNameParts = fileName.split(".");
    return fileNameParts[0];
}

function installFiles(src, dst, ext, substring) {
    const files = fs.readdirSync(src);

    if (files.length > 0) {
        createDir(dst);
    }

    console.log('Install Files fileName = ' + files);
    for (const file of files) {
        const fileExt = getExtension(file);
        console.log('fileName = ' + file);
        console.log('fileExt = ' + fileExt);

        if (typeof ext !== 'undefined') {
            console.log('extension = ' + ext);
            if (fileExt === `${ext}`) {
                const fileName = path.basename(file);
                if (typeof substring !== 'undefined') {
                    if (fileName.includes(substring)) {
                        console.log('matched fileName = ' + file);
                        copyFile(src + '/' + file, dst + '/' + file);
                    }
                } else {
                    console.log('matched fileName = ' + file);
                    copyFile(src + '/' + file, dst + '/' + file);
		}
            }
        } else {
            console.log('installed fileName = ' + file);
            copyFile(src + '/' + file, dst + '/' + file);
	}
    }
}

function installLibraries(src, dst, versionString) {
   if (typeof versionString !== 'undefined') {
       var version = versionString.split(".");
       var libExtension = ".so." + versionString;
       console.log('calling extension = ' + libExtension);
       installFiles(src, dst, libExtension);
       var linkExtension = ".so." + version[0];
       console.log('calling extension = ' + libExtension);
       createFilesLinkByExtension(src, dst, libExtension, linkExtension);
       libExtension = linkExtension;
       linkExtension = ".so";
       console.log('calling extension = ' + libExtension);
       createFilesLinkByExtension(src, dst, libExtension, linkExtension);
   } else {
       installFiles(src, dst, "so");
   }
}

function createFilesLinkByExtension(src, dst, srcExtension, linkExtension)
{
    const files = fs.readdirSync(src);

    for (const file of files) {
        const fileExt = getExtension(file);
        console.log('fileName = ' + file);

        if (fileExt === `${srcExtension}`) {
  	    const fileName = path.basename(file);
            console.log('file name inside createFilesLinkByExtension = ' + getName(fileName));
            createFileLink(fileName, dst + '/' + getName(fileName) + linkExtension);
        }
    }
}
