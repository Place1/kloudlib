import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes'
import { makename } from '../pulumi';

export interface OpenPolicyAgentInputs {

}

export interface OpenPolicyAgentOutputs {

}

export class OpenPolicyAgent extends pulumi.CustomResource implements OpenPolicyAgentOutputs {
  constructor(name: string, props: OpenPolicyAgentInputs, opts?: pulumi.CustomResourceOptions) {
    super(makename('OpenPolicyAgent'), name, props, opts);
  }
}
