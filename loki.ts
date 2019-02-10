import * as pulumi from '@pulumi/pulumi';

export class Loki extends pulumi.CustomResource {
  constructor(private name: string) {
    super('loki', name);

    // lol
  }
}
