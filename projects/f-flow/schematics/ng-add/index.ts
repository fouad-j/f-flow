import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask, RunSchematicTask } from '@angular-devkit/schematics/tasks';
import { addPackageToPackageJson, getPackageVersionFromPackageJson } from './package-config';
import { ISchema } from './i-schema';

export default function (options: ISchema): Rule {
  return (host: Tree, context: SchematicContext) => {

    let fFlowVersion = getPackageVersionFromPackageJson(host, '@foblex/flow');

    if (fFlowVersion === null) {
      addPackageToPackageJson(host, '@angular/material', `^12.6.0`);
    }

    const installTaskId = context.addTask(new NodePackageInstallTask());

    context.addTask(new RunSchematicTask('ng-add-setup-project', options), [ installTaskId ]);
  };
}
