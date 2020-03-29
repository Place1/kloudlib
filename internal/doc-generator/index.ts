import * as ts from 'typescript';
import * as tsdoc from '@microsoft/tsdoc';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as writer from './writer';
import { tsquery } from '@phenomnomnominal/tsquery';
import { flatMap } from 'lodash';
import { ComponentInputs, ComponentOutputs, Component } from './models';
import { getProperties } from './tsdoc';

// for debugging purposes
(global as any).tsquery = tsquery;
(global as any).ts = ts;

function getInputs(sourceFile: ts.SourceFile, klass: ts.ClassDeclaration): ComponentInputs {
  const param = tsquery<ts.ParameterDeclaration>(klass, 'Constructor > Parameter')[1];
  const ident = tsquery<ts.Identifier>(param, 'TypeReference > Identifier')[0];
  const name = ident.getText();
  const source = tsquery<ts.InterfaceDeclaration>(sourceFile, `InterfaceDeclaration:has(Identifier[name="${name}"])`)[0];
  return {
    name: name,
    properties: getProperties(source),
    source: source.getText(),
  }
}

function getOutputs(sourceFile: ts.SourceFile, klass: ts.ClassDeclaration): ComponentOutputs {
  const iface = tsquery<ts.HeritageClause>(klass, `HeritageClause[token=${ts.SyntaxKind.ImplementsKeyword}]`)[0]
  const ident = tsquery<ts.Identifier>(iface, 'Identifier')[0];
  const name = ident.getText();
  const source = tsquery<ts.InterfaceDeclaration>(sourceFile, `InterfaceDeclaration:has(Identifier[name="${name}"])`)[0];
  return {
    name: name,
    properties: getProperties(source),
    source: source.getText(),
  };
}

function getComponents(sourceFile: ts.SourceFile): Component[] {
  return tsquery<ts.ClassDeclaration>(sourceFile, 'ClassDeclaration:has(HeritageClause:has(Identifier[name="ComponentResource"]))')
    .map(klass => {
      const component: Component = {
        name: klass.name!.getText(),
        inputs: getInputs(sourceFile, klass),
        outputs: getOutputs(sourceFile, klass),
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
    const ast = tsquery.ast(code);
    return getComponents(ast);
  });

  const filesToWrite = components.map(component => {
    return {
      path: path.join('docs', `${component.name}.md`),
      content: writer.componentToMarkdown(component),
    }
  });

  try {
    fs.mkdirSync('docs');
  } catch {}

  for (const file of filesToWrite) {
    fs.writeFileSync(file.path, file.content, { encoding: 'utf8' });
  }

  console.log();
}

main();
