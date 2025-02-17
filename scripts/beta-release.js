const fs = require('fs');
const path = require('path');

const packageJson = require('../package.json');
const version = packageJson.version.split('.');

packageJson.version = `${version[0]}.${version[1]}.${process.argv[process.argv.length-1].substr(0, 7)}`;
packageJson.preview = true;
packageJson.name = "vscode-front-matter-beta";
packageJson.displayName = `${packageJson.displayName} BETA`;
packageJson.description = `BETA Version of Front Matter. ${packageJson.description}`;
packageJson.icon = "assets/frontmatter-beta.png";
packageJson.homepage = "https://beta.frontmatter.codes";

console.log(packageJson.version);

fs.writeFileSync(path.join(path.resolve('.'), 'package.json'), JSON.stringify(packageJson, null, 2));

let readme = fs.readFileSync(path.join(__dirname, '../README.beta.md'), 'utf8');
fs.writeFileSync(path.join(__dirname, '../README.md'), readme);