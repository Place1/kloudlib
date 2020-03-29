export interface Component {
  name: string;
  inputs: ComponentInputs;
  outputs: ComponentOutputs;
}

export interface ComponentInputs {
  name: string;
  properties: Property[];
  source: string;
}

export interface ComponentOutputs {
  name: string;
  properties: Property[];
  source: string;
}

export interface Property {
  name: string;
  description: string;
  type: string;
  required: boolean;
}
