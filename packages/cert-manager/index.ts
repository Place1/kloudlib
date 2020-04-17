/**
 * CertManager is based on [jetstack's cert-manager](https://github.com/jetstack/cert-manager) helm chart.
 *
 * @module "@kloudlib/cert-manager"
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import { CertManager } from '@kloudlib/cert-manager';
 *
 * new CertManger('cert-manager', {
 *   useStagingACME: true,
 *   acme: {
 *     email: 'admin@example.com',
 *   },
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as abstractions from '@kloudlib/abstractions';

export interface CertManagerInputs {
  provider?: k8s.Provider;
  namespace?: pulumi.Input<string>;
  /**
   * the helm chart version
   */
  version?: string;
  /**
   * if true then the staging ACME api will be used
   * rather than the production ACME api.
   * defaults to true
   */
  useStagingACME?: boolean;
  /**
   * configure acme settings
   */
  acme?: {
    /**
     * the email that letsencrypt reminders will be sent to
     */
    email?: string;
  };
}

export interface CertManagerOutputs {
  /**
   * Helm metadata
   */
  meta: pulumi.Output<abstractions.HelmMeta>;
}

/**
 * @noInheritDoc
 */
export class CertManager extends pulumi.ComponentResource implements CertManagerOutputs {
  readonly meta: pulumi.Output<abstractions.HelmMeta>;

  constructor(name: string, props?: CertManagerInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:CertManager', name, props, opts);

    const crds = new k8s.yaml.ConfigFile(
      `${name}-crd`,
      {
        file: 'https://raw.githubusercontent.com/jetstack/cert-manager/release-0.12/deploy/manifests/00-crds.yaml',
      },
      {
        parent: this,
        provider: props?.provider,
      }
    );

    const certIssuer = new k8s.apiextensions.CustomResource(
      'cluster-issuer',
      {
        apiVersion: 'cert-manager.io/v1alpha2',
        kind: 'ClusterIssuer',
        metadata: {
          namespace: props?.namespace,
          name: 'cert-issuer',
        },
        spec: {
          acme: {
            server:
              props?.useStagingACME === false
                ? 'https://acme-v02.api.letsencrypt.org/directory'
                : 'https://acme-staging-v02.api.letsencrypt.org/directory',
            email: props?.acme?.email,
            http01: {},
            privateKeySecretRef: {
              name: 'letsencrypt-production',
            },
            solvers: [
              {
                http01: {
                  ingress: {
                    class: 'nginx',
                  },
                },
              },
            ],
          },
        },
      },
      {
        parent: this,
        dependsOn: crds,
        provider: props?.provider,
      }
    );

    this.meta = pulumi.output<abstractions.HelmMeta>({
      chart: 'cert-manager',
      version: props?.version ?? 'v0.12.0',
      repo: 'https://charts.jetstack.io',
    });

    // Note: cert manager requires manual installation of
    // custom resource definitions. This has been done above.
    // When upgrading cert manager these CRDs will generally
    // also require updating. Please follow the online documentation
    // when updating cert manager closely.
    // https://github.com/jetstack/cert-manager/tree/master/deploy
    const certManager = new k8s.helm.v3.Chart(
      'cert-manager',
      {
        namespace: props?.namespace,
        version: this.meta.version,
        chart: this.meta.chart,
        fetchOpts: {
          repo: this.meta.repo,
        },
        values: {
          ingressShim: {
            defaultIssuerKind: 'ClusterIssuer',
            defaultIssuerName: certIssuer.metadata.name,
          },
        },
      },
      {
        parent: this,
        dependsOn: certIssuer,
        providers: props?.provider
          ? {
              kubernetes: props?.provider,
            }
          : {},
      }
    );
  }
}
