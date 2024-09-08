import {normalize, logging, workspaces} from '@angular-devkit/core';
import {
  chain,
  noop,
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
} from '@angular-devkit/schematics';
import {
  getProjectFromWorkspace,
  getProjectStyleFile,
  getProjectTargetOptions,
  getProjectTestTargets,
  getProjectBuildTargets,
} from '@angular/cdk/schematics';
import {InsertChange} from '@schematics/angular/utility/change';
import {getWorkspace, updateWorkspace} from '@schematics/angular/utility/workspace';
import {join} from 'path';
import {ISchema} from '../i-schema';
import {globalStyles} from './global-styles';

const prebuiltThemePathSegment = '@angular/material/prebuilt-themes';

export function addThemeToAppStyles(options: ISchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    return options.isSetupExample
      ? insertCustomTheme(options.project, host, context.logger)
      : Promise.resolve();
  };
}

async function insertCustomTheme(
  projectName: string,
  host: Tree,
  logger: logging.LoggerApi,
): Promise<Rule> {
  const workspace = await getWorkspace(host);
  const project = getProjectFromWorkspace(workspace, projectName);
  const stylesPath = getProjectStyleFile(project, 'scss');
  const themeContent = globalStyles(projectName);

  if (!stylesPath) {
    if (!project.sourceRoot) {
      throw new SchematicsException(
        `Could not find source root for project: "${projectName}". ` +
          `Please make sure that the "sourceRoot" property is set in the workspace config.`,
      );
    }

    const customThemePath = normalize(join(project.sourceRoot, defaultCustomThemeFilename));

    if (host.exists(customThemePath)) {
      logger.warn(`Cannot create a custom Angular Material theme because
          ${customThemePath} already exists. Skipping custom theme generation.`);
      return noop();
    }

    host.create(customThemePath, themeContent);
    return addThemeStyleToTarget(projectName, 'build', customThemePath, logger);
  }

  const insertion = new InsertChange(stylesPath, 0, themeContent);
  const recorder = host.beginUpdate(stylesPath);

  recorder.insertLeft(insertion.pos, insertion.toAdd);
  host.commitUpdate(recorder);
  return noop();
}

function addThemeStyleToTarget(
  projectName: string,
  targetName: 'test' | 'build',
  assetPath: string,
  logger: logging.LoggerApi,
): Rule {
  return updateWorkspace(workspace => {
    const project = getProjectFromWorkspace(workspace, projectName);

    // Do not update the builder options in case the target does not use the default CLI builder.
    if (!validateDefaultTargetBuilder(project, targetName, logger)) {
      return;
    }

    const targetOptions = getProjectTargetOptions(project, targetName);
    const styles = targetOptions['styles'] as (string | {input: string})[];

    if (!styles) {
      targetOptions['styles'] = [assetPath];
    } else {
      const existingStyles = styles.map(s => (typeof s === 'string' ? s : s.input));

      for (let [index, stylePath] of existingStyles.entries()) {
        // If the given asset is already specified in the styles, we don't need to do anything.
        if (stylePath === assetPath) {
          return;
        }
        if (stylePath.includes(defaultCustomThemeFilename)) {
          logger.error(
            `Could not add the selected theme to the CLI project ` +
              `configuration because there is already a custom theme file referenced.`,
          );
          logger.info(`Please manually add the following style file to your configuration:`);
          logger.info(`    ${assetPath}`);
          return;
        } else if (stylePath.includes(prebuiltThemePathSegment)) {
          styles.splice(index, 1);
        }
      }

      styles.unshift(assetPath);
    }
  });
}

/**
 * Validates that the specified project target is configured with the default builders which are
 * provided by the Angular CLI. If the configured builder does not match the default builder,
 * this function can either throw or just show a warning.
 */
function validateDefaultTargetBuilder(
  project: workspaces.ProjectDefinition,
  targetName: 'build' | 'test',
  logger: logging.LoggerApi,
) {
  const targets =
    targetName === 'test' ? getProjectTestTargets(project) : getProjectBuildTargets(project);
  const isDefaultBuilder = targets.length > 0;
  if (!isDefaultBuilder && targetName === 'build') {
    throw new SchematicsException(
      `Your project is not using the default builders for ` +
        `"${targetName}". The Angular Material schematics cannot add a theme to the workspace ` +
        `configuration if the builder has been changed.`,
    );
  } else if (!isDefaultBuilder) {
    logger.warn(
      `Your project is not using the default builders for "${targetName}". This ` +
        `means that we cannot add the configured theme to the "${targetName}" target.`,
    );
  }

  return isDefaultBuilder;
}
