import * as ts from 'typescript';
import * as tsdoc from '@microsoft/tsdoc';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as writer from './writer';
import { tsquery } from '@phenomnomnominal/tsquery';
import { flatMap } from 'lodash';
import { ComponentInputs, ComponentOutputs, Component, Context } from './models';
import { getProperties } from './properties';
import { tsdocComment, tsdocExamples } from './tsdoc';

// for debugging purposes
(global as any).tsquery = tsquery;
(global as any).ts = ts;

function getInputs(ctx: Context, sourceFile: ts.SourceFile, klass: ts.ClassDeclaration): ComponentInputs {
  const param = tsquery<ts.ParameterDeclaration>(klass, 'Constructor > Parameter')[1];
  const ident = tsquery<ts.Identifier>(param, 'TypeReference > Identifier')[0];
  const name = ident.getText();
  const source = tsquery<ts.InterfaceDeclaration>(sourceFile, `InterfaceDeclaration:has(Identifier[name="${name}"])`)[0];
  return {
    name: name,
    properties: getProperties(ctx, source),
    source: source.getText(),
  }
}

function getOutputs(ctx: Context, sourceFile: ts.SourceFile, klass: ts.ClassDeclaration): ComponentOutputs {
  const iface = tsquery<ts.HeritageClause>(klass, `HeritageClause[token=${ts.SyntaxKind.ImplementsKeyword}]`)[0]
  const ident = tsquery<ts.Identifier>(iface, 'Identifier')[0];
  const name = ident.getText();
  const source = tsquery<ts.InterfaceDeclaration>(sourceFile, `InterfaceDeclaration:has(Identifier[name="${name}"])`)[0];
  return {
    name: name,
    properties: getProperties(ctx, source),
    source: source.getText(),
  };
}

function getComponents(ctx: Context, pkg: string, sourceFile: ts.SourceFile): Component[] {
  return tsquery<ts.ClassDeclaration>(sourceFile, 'ClassDeclaration:has(HeritageClause:has(Identifier[name="ComponentResource"]))')
    .map(klass => {
      const component: Component = {
        package: pkg,
        name: klass.name!.getText(),
        description: tsdocComment(klass),
        inputs: getInputs(ctx, sourceFile, klass),
        outputs: getOutputs(ctx, sourceFile, klass),
        examples: tsdocExamples(klass),
      };
      return component;
    });
}

function main() {
  const base = path.join(__dirname, '../../packages/');
  const files = glob.sync('**/*.ts', {
    cwd: base,
    ignore: ['**/node_modules/**']
  });

  const components = flatMap(files, file => {
    const code = fs.readFileSync(path.join(base, file), 'utf8');
    // const ast = ts.createSourceFile(path.join(base, file), code, ts.ScriptTarget.Latest, true);

    const program = ts.createProgram([path.join(base, file)], {});
    const checker = program.getTypeChecker();
    const ctx: Context = {program, checker};

    const ast = program.getSourceFile(program.getRootFileNames()[0])!
    return getComponents(ctx, path.dirname(file), ast);
  });

  const filesToWrite = components.map(component => {
    return {
      path: path.join(__dirname, '../../docs/src/packages/', `${component.name}.md`),
      content: writer.componentToMarkdown(component),
    }
  });

  for (const file of filesToWrite) {
    fs.writeFileSync(file.path, file.content, { encoding: 'utf8' });
  }

  console.log();
}

main();
