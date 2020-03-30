import { codeBlock } from 'common-tags';
import { Component, Property } from "./models";
import table from 'markdown-table';
import { code } from './markdown';

export function componentToMarkdown(component: Component) {
  const buffer = new Array<string>();

  buffer.push(codeBlock`
    # ${component.name}

    ${component.description}

    ## Usage

    ${'```'}typescript
    import { ${component.name} } from '@kloudlib/${component.package}';

    new ${component.name}('my-${component.package}', {
      // inputs...
    });
    ${'```'}

    ## Inputs

    ${propTable(component.inputs.properties)}

    ## Outputs

    ${propTable(component.outputs.properties)}
  `);

  if (component.examples) {
    buffer.push(codeBlock`
      ## Example(s)

      ${component.examples.join('\n\n')}
    `);
  }

  return buffer.join('\n\n');

}

function propTable(properties: Property[]): string {
  return table([
    ['name', 'type', 'description', 'required'],
    ...properties.map(prop => [
      prop.name,
      code(prop.type),
      prop.description.replace(/\n/g, ' '),
      prop.required ? 'yes' : 'no',
    ]),
  ]);
}

