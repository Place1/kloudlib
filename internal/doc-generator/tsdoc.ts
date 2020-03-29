import * as ts from 'typescript';
import * as tsdoc from '@microsoft/tsdoc';
import { tsquery } from '@phenomnomnominal/tsquery';
import { Property } from './models';
import { flatMap, trimStart } from 'lodash';

export function getProperties(iface: ts.InterfaceDeclaration): Property[] {
  return flatMap(tsquery<ts.PropertySignature>(iface, 'InterfaceDeclaration > PropertySignature'), node => getProps(node))
    .map(prop => {
      const p: Property = {
        name: prop.name,
        required: prop.node.questionToken !== undefined,
        type: getType(prop.node.type!),
        description: tsdocComment(prop.node),
      };
      return p;
    });
}

function getType(node: ts.TypeNode): string {
  if (node.kind === ts.SyntaxKind.TypeLiteral) {
    return 'object';
  }
  return node.getText();
}

interface Prop {
  name: string;
  node: ts.PropertySignature;
}

function getProps(property: ts.PropertySignature, prefix?: string): Prop[] {
  const current = {
    name: trimStart([prefix, property.name.getText()].join('.'), '.'),
    node: property,
  };

  const childNodes = tsquery<ts.PropertySignature>(property, 'TypeLiteral > PropertySignature')
    .filter(node => node !== current.node);

  const children = flatMap(childNodes, node => getProps(node, current.name));

  return [current, ...children];
}

type DocNodeVisitor = (docNode: tsdoc.DocNode) => void;

function walk(docNode: tsdoc.DocNode, visitor: DocNodeVisitor) {
  visitor(docNode);
  for (const node of docNode.getChildNodes()) {
    walk(node, visitor);
  }
}

function tsdocComment(tsnode: ts.Node) {
  const parser = new tsdoc.TSDocParser();
  const parserContext = parser.parseString(tsnode.getFullText());
  const comment = parserContext.docComment;
  const description = new Array<string>();
  walk(comment.summarySection, (node) => {
    switch (node.kind) {
      case tsdoc.DocNodeKind.PlainText:
        description.push((node as tsdoc.DocPlainText).text);
        break;
      case tsdoc.DocNodeKind.SoftBreak:
        description.push('\n');
        break;
    }
  });
  return description.join('').trim();
}
