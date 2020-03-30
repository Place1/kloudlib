import * as ts from "typescript";

export interface Context {
  program: ts.Program;
  checker: ts.TypeChecker;
}

export interface Component {
  package: string;
  name: string;
  description: string;
  inputs: ComponentInputs;
  outputs: ComponentOutputs;
  examples: string[];
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
