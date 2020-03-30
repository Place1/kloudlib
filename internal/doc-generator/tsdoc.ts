import * as ts from 'typescript';
import * as tsdoc from '@microsoft/tsdoc';
import { block } from './markdown';


const config = new tsdoc.TSDocConfiguration();
// config.addTagDefinition(new tsdoc.TSDocTagDefinition({
//   tagName: '@example',
//   syntaxKind: tsdoc.TSDocTagSyntaxKind.BlockTag,
//   allowMultiple: true,
// }));
const parser = new tsdoc.TSDocParser(config);

export function tsdocComment(tsnode: ts.Node): string {
  const ctx = parser.parseString(tsnode.getFullText());
  const comment = ctx.docComment;
  return extractText(comment.summarySection);
}

export function tsdocExamples(tsnode: ts.Node): string[] {
  const ctx = parser.parseString(tsnode.getFullText());
  return ctx.docComment.customBlocks
    .filter(block => block.blockTag.tagName === '@example')
    .map(block => extractText(block));
}

function extractText(docNode: tsdoc.DocNode): string {
  const buffer = new Array<string>();
  walk(docNode, (node) => {
    switch (node.kind) {
      case tsdoc.DocNodeKind.PlainText:
        buffer.push((node as tsdoc.DocPlainText).text);
        break;
      case tsdoc.DocNodeKind.SoftBreak:
        buffer.push('\n');
        break;
      case tsdoc.DocNodeKind.FencedCode:
        const fencedCode = node as tsdoc.DocFencedCode;
        buffer.push(block(fencedCode.code, fencedCode.language));
        break;
    }
  });
  return buffer.join('').trim();
}

type DocNodeVisitor = (docNode: tsdoc.DocNode) => void;

function walk(docNode: tsdoc.DocNode, visitor: DocNodeVisitor) {
  visitor(docNode);
  for (const node of docNode.getChildNodes()) {
    walk(node, visitor);
  }
}
