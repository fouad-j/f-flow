import { Tree } from '@angular-devkit/schematics';

interface PackageJson {
  dependencies: Record<string, string>;
}

function sortObjectByKeys(obj: Record<string, string>) {
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[ key ] = obj[ key ];
      return result;
    }, {} as Record<string, string>);
}

export function addPackageToPackageJson(host: Tree, pkg: string, version: string): Tree {
  if (host.exists('package.json')) {
    const sourceText = host.read('package.json')!.toString('utf-8');
    const json = JSON.parse(sourceText) as PackageJson;

    if (!json.dependencies) {
      json.dependencies = {};
    }

    if (!json.dependencies[ pkg ]) {
      json.dependencies[ pkg ] = version;
      json.dependencies = sortObjectByKeys(json.dependencies);
    }

    host.overwrite('package.json', JSON.stringify(json, null, 2));
  }

  return host;
}

export function getPackageVersionFromPackageJson(tree: Tree, name: string): string | null {
  if (!tree.exists('package.json')) {
    return null;
  }

  const packageJson = JSON.parse(tree.read('package.json')!.toString('utf8')) as PackageJson;

  if (packageJson.dependencies && packageJson.dependencies[ name ]) {
    return packageJson.dependencies[ name ];
  }

  return null;
}
