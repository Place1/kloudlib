module.exports = {
  mode: 'modules',
  out: 'docs/src/packages/',
  theme: 'docs/typedoc-theme',
  exclude: ['**/node_modules/**', '**/internal/**', '**/template/**'],
  name: 'kloudlib',
  excludePrivate: true,
  excludeProtected: true,
  excludeNotExported: true,
  excludeExternals: true,
  hideGenerator: true,
  hideBreadcrumbs: true,
};
