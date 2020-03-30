import * as ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { Property, Context } from './models';
import { flatMap, trimStart, trim } from 'lodash';
import { tsdocComment } from './tsdoc';

export function getProperties(ctx: Context, iface: ts.InterfaceDeclaration): Property[] {
  const ifaceSymbol = ctx.checker.getSymbolAtLocation(iface.name)!;
  const ifaceType = ctx.checker.getDeclaredTypeOfSymbol(ifaceSymbol);
  const properties = ifaceType.getApparentProperties();
  return flatMap(properties, p => getProps(ctx, p))
    .map(prop => {
      const p: Property = {
        name: prop.name,
        // required: prop.node.questionToken === undefined,
        required: false,
        type: getType(ctx, prop.node),
        description: tsdocComment(prop.node),
      };
      return p
    });
}

function getType(ctx: Context, node: ts.Node): string {
  const t = ctx.checker.getTypeAtLocation(node);
  const s = t.getSymbol();
  if (!s) {
    return 'unknown';
  }
  return s.getName();
}

interface Prop {
  name: string;
  node: ts.Node;
}

function getProps(ctx: Context, prop: ts.Symbol, prefix?: string): Prop[] {
  const allow = [
    ts.SyntaxKind.PropertySignature,
    ts.SyntaxKind.PropertyDeclaration,
  ];
  if (!allow.includes(prop.valueDeclaration?.kind)) {
    return [];
  }

  let suffix = '';

  // if we're on an array then we'll reflect this in the
  // property name prefix and move the algorithm forward
  // to the array's item type.
  if (ts.isPropertySignature(prop.valueDeclaration) && prop.valueDeclaration.type) {
    if (ts.isArrayTypeNode(prop.valueDeclaration.type)) {
      suffix = '[]';
      const s = ctx.checker.getTypeFromTypeNode(prop.valueDeclaration.type.elementType).getSymbol()!;
      if (s.valueDeclaration !== undefined) {
        prop = s;
      } else {
        console.log();
      }
    }
  }

  const current = {
    name: trim([prefix, prop.getName() + suffix].join('.'), '.'),
    node: prop.valueDeclaration,
  };

  const propType = ctx.checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration);
  const children = flatMap(propType.getApparentProperties(), p => getProps(ctx, p, current.name));

  return [current, ...children];
}

function isArrayType(node: ts.Node) {
  return tsquery(node, 'ArrayType').length !== 0;
}
