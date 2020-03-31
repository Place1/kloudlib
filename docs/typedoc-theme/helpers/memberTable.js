const table = require('markdown-table');
const { type } = require('typedoc-plugin-markdown/dist/resources/helpers/type');

/**
 * @this { import("typedoc").ContainerReflection }
 */
function memberTable() {
  const children = this.children.filter(prop => prop.name !== 'constructor');

  if (children.length === 0) {
    return '';
  }

  return table([
    ['property', 'type', 'description'],
    ...children.map(prop => {
      const row = [
        prop.name,
        String(type.call(prop.type)),
        getCommentText(prop.comment),
      ];
      return row.map(tableEscape);
    }),
  ]);
}

/**
 *
 * @param { import("typedoc/dist/lib/models/comments").Comment } comment
 */
function getCommentText(comment) {
  if (comment && comment.shortText) {
    return (comment.shortText + '\n\n' + comment.text).trim();
  }
  return '-'
}

function tableEscape(text) {
  if (typeof(text) === 'string') {
    return text
      .replace(/\|/g, '\\|')
      .replace(/\n/g, '<br>');
  }
}

module.exports = {
  memberTable,
};
