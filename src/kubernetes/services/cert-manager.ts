import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes'
import * as basics from './basics';

export interface CertManagerInputs {
  provider: k8s.Provider,
  // the helm chart version
  version?: string,
  // if true then the staging ACME api will be used
  // rather than the production ACME api.
  // defaults to false
  useStagingACME?: boolean;
  // configure acme settings
  acme?: {
    // the email that letsencrypt reminders will be sent to
    email?: string;
  };
}

export interface CertManagerOutputs {
  meta: pulumi.Output<basics.HelmMeta>;
  namespace: pulumi.Output<string>;
}

export class CertManager extends pulumi.ComponentResource implements CertManagerOutputs {

  readonly meta: pulumi.Output<basics.HelmMeta>;
  readonly namespace: pulumi.Output<string>;

  constructor(name: string, props: CertManagerInputs, opts?: pulumi.CustomResourceOptions) {
    super('CertManager', name, props, opts);

    const namespace = new k8s.core.v1.Namespace('cert-manager-namespace', {
      metadata: {
        name: 'cert-manager',
        labels: {
          'certmanager.k8s.io/disable-validation': 'true',
        },
      },
    }, {
      parent: this,
      provider: props.provider,
    });

    this.namespace = namespace.metadata.name;

    const crds = new k8s.yaml.ConfigFile('cert-manager-custom-resource-definitions', {
      file: 'https://raw.githubusercontent.com/jetstack/cert-manager/release-0.9/deploy/manifests/00-crds.yaml',
    }, {
      parent: this,
      provider: props.provider,
    });

    const certIssuer = new k8s.apiextensions.CustomResource('cert-issuer', {
      apiVersion: 'certmanager.k8s.io/v1alpha1',
      kind: 'ClusterIssuer',
      metadata: {
        namespace: 'cert-manager',
        name: 'cert-issuer',
      },
      spec: {
        acme: {
          server: props.useStagingACME === true // undefined or null means to use production
            ? 'https://acme-staging-v02.api.letsencrypt.org/directory'
            : 'https://acme-v02.api.letsencrypt.org/directory',
          email: props?.acme?.email,
          http01: {},
          privateKeySecretRef: {
            name: 'letsencrypt-production',
          },
          solvers: [{
            http01: {
              ingress: {
                class: 'nginx',
              },
            },
          }],
        },
      },
    }, {
      parent: this,
      dependsOn: crds,
      provider: props.provider,
    });

    this.meta = pulumi.output<basics.HelmMeta>({
      chart: 'cert-manager',
      version: props.version ?? 'v0.12.0',
      repo: 'https://charts.jetstack.io',
    });

    // Note: cert manager requires manual installation of
    // custom resource definitions. This has been done above.
    // When upgrading cert manager these CRDs will generally
    // also require updating. Please follow the online documentation
    // when updating cert manager closely.
    // https://github.com/jetstack/cert-manager/tree/master/deploy
    const certManager = new k8s.helm.v2.Chart('cert-manager', {
      namespace: 'cert-manager',
      version: this.meta.version,
      chart: this.meta.chart,
      fetchOpts: {
        repo: this.meta.repo,
      },
      values: {
        ingressShim: {
          defaultIssuerKind: 'ClusterIssuer',
          defaultIssuerName: 'cert-issuer',
        },
      }
    }, {
      parent: this,
      dependsOn: certIssuer,
      providers: {
        kubernetes: props.provider,
      },
    });
  }
}
