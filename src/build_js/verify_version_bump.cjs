
const { execSync, execFileSync } = require('child_process'),
      { readFileSync }           = require('fs'),
      semver                     = require('semver');

const pkg              = readFileSync('./package.json'),
      pJson            = JSON.parse(pkg),
      priv_version     = pJson.version;

// Look up the currently-published version. If the package has never been
// published, `npm view` exits non-zero with a 404 — that is not an error for
// this check, it just means there is no public version to compare against yet.
// Capture it as an empty string rather than letting the throw crash the script.
let public_version = '';
try {
  public_version = `${execFileSync('npm', ['view', pJson.name, 'version'], { stdio: ['ignore', 'pipe', 'ignore'] })}`.trim();
} catch {
  public_version = '';
}

const last_commit_msg = `${execSync('git show -s --format=%s')}`.trim().replace(/[^0-9a-z _\-=]/gi, '');



// No published version yet: this is a first release. As long as the local
// version is valid semver, there is nothing to regress against — pass.
if (!semver.valid(public_version)) {
  if (semver.valid(priv_version)) {
    console.log(`No published version of ${pJson.name} yet — treating ${priv_version} as a first release; passing ☑`);
    // eslint-disable-next-line no-undef
    process.exit(0);
  }
  console.log(`Invalid private version ${priv_version}`);
  // eslint-disable-next-line no-undef
  process.exit(1);
}

if (semver.valid(priv_version)) {
  if (semver.gt(public_version, priv_version)) {
    console.log(`Version regression: locally ${priv_version}, publicly ${public_version}`);
  } else {
    if (semver.gt(priv_version, public_version)) {

      try {

        console.log(`Version is updated; passing ☑\n  (public ${public_version}, private ${priv_version})\n\nApplying tags`);
        execSync(`git tag -a v${priv_version} -m ${JSON.stringify(last_commit_msg)}`);
        // eslint-disable-next-line no-undef
        process.exit(0);

      } catch (e) {

        console.log("Error!\n=====\n");

        console.log( e.stdout.toString() );

        console.log("\n-----\n");
        console.log( e.stderr.toString() );

        console.log("\n-----\n");

        console.log( require('util').inspect(e) );

        console.log("\n=====\n");

      }


    } else {
      console.log(`Version unchanged: locally ${priv_version}, publicly also ${public_version}`);
  } }
} else {
  console.log(`Invalid private version ${priv_version}`);
}

// valid exit manually controls as 0; anything getting here was in error
// eslint-disable-next-line no-undef
process.exit(1);
