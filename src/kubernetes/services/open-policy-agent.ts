import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes'

export interface OpenPolicyAgentInputs {

}

export interface OpenPolicyAgentOutputs {

}

export class OpenPolicyAgent extends pulumi.ComponentResource implements OpenPolicyAgentOutputs {
  constructor(name: string, props: OpenPolicyAgentInputs, opts?: pulumi.CustomResourceOptions) {
    super('OpenPolicyAgent', name, props, opts);
  }
}
