import { codeBlock } from 'common-tags';
import { Component, Property } from "./models";
import table from 'markdown-table';

export function componentToMarkdown(component: Component) {
  return codeBlock`
    # ${component.name}

    ## Inputs

    ${propTable(component.inputs.properties)}

    ## Outputs

    ${propTable(component.outputs.properties)}
  `;

}

function propTable(properties: Property[]): string {
  return table([
    ['name', 'type', 'description', 'required'],
    ...properties.map(prop => [
      prop.name,
      prop.type,
      prop.description.replace(/\n/g, ' '),
      prop.required ? 'yes' : 'no',
    ]),
  ]);
}
