/**
 * @module "@kloudlib/metal-lb"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { MetalLB } from '@kloudlib/metal-lb';
 *
 * new MetalLB('metal-lb', {
 *   // ...
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as random from '@pulumi/random';
import * as abstractions from '@kloudlib/abstractions';

export interface MetalLBInputs {
  provider?: k8s.Provider;
  namespace?: pulumi.Input<string>;
  /**
   * the helm chart version
   */
  version?: string;
  addressPools?: AddressPool[];
}

export interface AddressPool {
  name: string;
  protocol: 'layer2';
  addresses: string[];
}

export interface MetalLBOutputs {
  meta: pulumi.Output<abstractions.HelmMeta>;
}

/**
 * @noInheritDoc
 */
export class MetalLB extends pulumi.ComponentResource implements MetalLBOutputs {
  readonly meta: pulumi.Output<abstractions.HelmMeta>;

  constructor(name: string, props?: MetalLBInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:MetalLB', name, props, opts);

    this.meta = pulumi.output<abstractions.HelmMeta>({
      chart: 'metallb',
      version: props?.version ?? '1.0.0',
      repo: 'https://charts.bitnami.com/bitnami',
    });

    const secretKey = new random.RandomString('metallb-memberlist',
      { length: 256 },
      { parent: this }
    )

    const secret = new k8s.core.v1.Secret(
      name,
      {
        metadata: {
          namespace: props?.namespace,
        },
        stringData: {
          secretkey: secretKey.result
        }
      },
      {
        parent: this,
        provider: props?.provider,
      }
    )

    const metallb = new k8s.helm.v3.Chart(
      name,
      {
        namespace: props?.namespace,
        chart: this.meta.chart,
        version: this.meta.version,
        fetchOpts: {
          repo: this.meta.repo,
        },
        values: {
          speaker: {
            secretName: secret.metadata.name
          },
          configInline: {
            'address-pools': props?.addressPools?.map((pool) => ({
              name: pool.name,
              protocol: pool.protocol,
              addresses: pool.addresses,
              'avoid-buggy-ips': true,
            })),
          },
        },
      },
      {
        parent: this,
        provider: props?.provider,
      }
    );
  }
}
