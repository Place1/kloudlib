export function code(value: string) {
  return '`' + value + '`';
}

export function block(value: string, language: string) {
  return '```' + language + '\n' + value + '\n```'
}
