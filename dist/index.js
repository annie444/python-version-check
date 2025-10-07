import {getInput as $jWA4o$getInput, setFailed as $jWA4o$setFailed, debug as $jWA4o$debug, setOutput as $jWA4o$setOutput, info as $jWA4o$info} from "@actions/core";
import {HttpClient as $jWA4o$HttpClient} from "@actions/http-client";
import {getExecOutput as $jWA4o$getExecOutput} from "@actions/exec";
import {promises as $jWA4o$promises} from "node:fs";
import {dirname as $jWA4o$dirname, resolve as $jWA4o$resolve} from "node:path";
import {load as $jWA4o$load} from "js-toml";

/**
 * The entrypoint for the action. This file simply imports and runs the action's
 * main logic.
 */ 

async function $b51c3b5d14aa04fd$export$746251fb0c041440(index, packageName) {
    // Return list of versions; null on network / JSON errors.
    const http = new $jWA4o$HttpClient('pypi-versions-action', [], {
        allowRetries: true,
        maxRetries: 3
    });
    const url = `${index}/${packageName}`;
    const headers = {
        Accept: 'application/vnd.pypi.simple.v1+json'
    };
    try {
        const resp = await http.get(url, headers);
        if (resp.message.statusCode === 404) return [];
        if (resp.message.statusCode && resp.message.statusCode >= 400) throw new Error(`${index}: HTTP ${resp.message.statusCode} - treated as unavailable`);
        const payload = await resp.readBody();
        const data = JSON.parse(payload);
        const versions = new Set();
        for (const file of data.files){
            const name = file.filename;
            let ver = name.replace(`${packageName.replace(/-/g, '_')}-`, '');
            ver = ver.split('-', 3)[0].replace('.tar.gz', '').replace('.zip', '');
            versions.add(ver);
        }
        return new Array(...versions).sort();
    } catch (e) {
        const eObj = e;
        throw new Error(`${index}: ${eObj.message} - treated as unavailable`);
    }
}






/**
 * Asserts that the given object has a 'project' field which is an object.
 * Throws an error if the assertion fails.
 *
 * @param obj - The object to check.
 * @throws {Error} If the object does not have a 'project' field or if it is not an object.
 * @returns void
 */ function $5e28ac237dc738a1$var$assertHasProject(obj) {
    if (!Object.hasOwn(obj, 'project')) throw new Error('No [project] section found in pyproject.toml');
    if (typeof obj.project !== 'object') throw new Error('[project] section is not an object');
}
/**
 * Asserts that the given object has a 'name' field which is a string.
 * Throws an error if the assertion fails.
 *
 * @param obj - The object to check.
 * @throws {Error} If the object does not have a 'name' field or if it is not a string.
 * @returns void
 */ function $5e28ac237dc738a1$var$assertHasName(obj) {
    if (!Object.hasOwn(obj, 'name')) throw new Error('No name field in [project] section of pyproject.toml');
    if (typeof obj.name !== 'string') throw new Error('name field in [project] section is not a string');
}
/**
 * Asserts that the given object has a 'version' field which is a string.
 * Throws an error if the assertion fails.
 *
 * @param obj - The object to check.
 * @throws {Error} If the object does not have a 'version' field or if it is not a string.
 * @returns void
 */ function $5e28ac237dc738a1$var$assertHasVersion(obj) {
    if (!Object.hasOwn(obj, 'version')) throw new Error('No version field in [project] section of pyproject.toml');
    if (typeof obj.version !== 'string') throw new Error('version field in [project] section is not a string');
}
/**
 * Asserts that the given object has a 'dynamic' field which is an array of strings.
 * Throws an error if the assertion fails.
 *
 * @param obj - The object to check.
 * @throws {Error} If the object does not have a 'dynamic' field or if it is not an array of strings.
 * @returns void
 */ function $5e28ac237dc738a1$var$assertHasDynamic(obj) {
    if (!Object.hasOwn(obj, 'dynamic')) throw new Error('No dynamic field in [project] section of pyproject.toml');
    if (!Array.isArray(obj.dynamic)) throw new Error('dynamic field in [project] section is not an array');
    for (const item of obj.dynamic){
        if (typeof item !== 'string') throw new Error('dynamic field in [project] section is not an array of strings');
    }
}
async function $5e28ac237dc738a1$export$cd17d76da7967240(pyprojectPath) {
    const stat = await $jWA4o$promises.stat(pyprojectPath);
    if (!stat.isFile()) throw new Error(`Not a file: ${pyprojectPath}`);
    const file = await $jWA4o$promises.readFile(pyprojectPath, 'utf8');
    const toml = (0, $jWA4o$load)(file);
    $5e28ac237dc738a1$var$assertHasProject(toml);
    const project = toml.project;
    $5e28ac237dc738a1$var$assertHasName(project);
    const packageInfo = {
        name: project.name,
        path: $jWA4o$dirname($jWA4o$resolve(pyprojectPath))
    };
    try {
        $5e28ac237dc738a1$var$assertHasVersion(project);
        packageInfo.version = project.version;
    } catch  {
        // version field is optional if dynamic includes "version"
        // so we ignore the error here
        // we will get the version from python instead
        // if version is not in dynamic, we will error below
        $5e28ac237dc738a1$var$assertHasDynamic(project);
        if (!project.dynamic.includes('version')) throw new Error('No version field in [project] section of pyproject.toml');
        packageInfo.dynamic = project.dynamic;
    }
    return packageInfo;
}
async function $5e28ac237dc738a1$export$18cd124b5098d330(pkg) {
    if (pkg.version) return pkg.version;
    if (pkg.dynamic && pkg.dynamic.includes('version')) {
        // get version from python
        const res = await $jWA4o$getExecOutput('python3', [
            '-m',
            'pip',
            'install',
            pkg.path
        ]);
        if (res.exitCode !== 0) throw new Error(`Failed to install package at ${pkg.path}. Stdout: ${res.stdout}. Stderr: ${res.stderr}.`);
        const res2 = await $jWA4o$getExecOutput('python3', [
            '-c',
            `import ${pkg.name.replace(/-/g, '_')}; print(${pkg.name.replace(/-/g, '_')}.__version__)`
        ]);
        if (res2.exitCode !== 0) throw new Error(`Failed to get version of package ${pkg.name}. Stdout: ${res2.stdout}. Stderr: ${res2.stderr}.`);
        const version = res2.stdout.trim();
        if (version === '') throw new Error('Failed to get version from pip');
        return version;
    }
    throw new Error('No version field in [project] section of pyproject.toml');
}


function $69e12e203d64454b$var$assertHasMessage(error) {
    if (typeof error !== 'object' || error === null || !('message' in error) || typeof error.message !== 'string') throw new TypeError('The error does not have a message property');
}
async function $69e12e203d64454b$export$889ea624f2cb2c57() {
    try {
        const pyprojectPath = $jWA4o$getInput('path');
        const simpleIndexUrl = $jWA4o$getInput('index');
        if (!pyprojectPath) {
            $jWA4o$setFailed('Input "path" is required');
            return;
        }
        if (!simpleIndexUrl) {
            $jWA4o$setFailed('Input "index" is required');
            return;
        }
        $jWA4o$debug(`Looking for package at ${pyprojectPath}`);
        const packageInfo = await (0, $5e28ac237dc738a1$export$cd17d76da7967240)(pyprojectPath);
        const packageName = packageInfo.name;
        $jWA4o$debug(`Found package: ${packageName}`);
        const packageVersion = await (0, $5e28ac237dc738a1$export$18cd124b5098d330)(packageInfo);
        $jWA4o$debug(`Found version: ${packageVersion}`);
        $jWA4o$setOutput('package_name', packageName);
        $jWA4o$setOutput('package_version', packageVersion);
        $jWA4o$debug(`Querying ${simpleIndexUrl} for published versions`);
        const versions = await (0, $b51c3b5d14aa04fd$export$746251fb0c041440)(simpleIndexUrl, packageName);
        if (versions === null) {
            $jWA4o$setFailed(`Failed to query index ${simpleIndexUrl}`);
            return;
        }
        $jWA4o$info(`Published versions for ${packageName}: ${versions.join(', ')}`);
        const versionExists = versions.length > 0 ? versions.includes(packageVersion) : false;
        $jWA4o$setOutput(`current_version_exists`, versionExists);
    } catch (error) {
        // Fail the workflow run if an error occurs
        try {
            $69e12e203d64454b$var$assertHasMessage(error);
            $jWA4o$setFailed(error.message);
        } catch  {
            $jWA4o$setFailed(`An unknown error occurred: ${String(error)}`);
        }
    }
}


/* istanbul ignore next */ (0, $69e12e203d64454b$export$889ea624f2cb2c57)();


//# sourceMappingURL=index.js.map
