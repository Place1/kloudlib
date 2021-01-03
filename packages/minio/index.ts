/**
 * minio is based off stable/minio
 *
 * @module "@kloudlib/minio"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { Minio } from '@kloudlib/minio';
 *
 * new Minio('minio', {
 *   // ...
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as random from '@pulumi/random';
import * as abstractions from '@kloudlib/abstractions';
import { removeHelmHooks } from '@kloudlib/utils';

export interface MinioInputs {
  /**
   * The pulumi kubernetes provider
   */
  provider?: k8s.Provider;
  /**
   * A kubernetes namespace. If present, this will override
   * the given provider's namespace.
   */
  namespace?: pulumi.Input<string>;
  /**
   * Helm chart version
   */
  version?: string;
  /**
   * The minio access key.
   * Must be 5 to 20 characters.
   * Defaults to a pulumi.RandomPassword
   */
  accessKey?: pulumi.Input<string>;
  /**
   * The minio secret key.
   * Must be 8 to 40 characters.
   * Defaults to a pulumi.RandomPassword
   */
  secretKey?: pulumi.Input<string>;
  /**
   * A list of buckets to create after
   * minio is installed.
   */
  buckets?: MinioBucket[];
  /**
   * The minio server mode
   * Defaults to standalone
   */
  mode?: pulumi.Input<'standalone' | 'distributed'>;
  /**
   * The number of minio replicas.
   * This must be 1 for standalone mode.
   * Defaults to 1
   */
  replicas?: pulumi.Input<number>;
  /**
   * Number of zones.
   * Only applicable for distributed mode.
   * Defaults to 1
   */
  zones?: pulumi.Input<number>;
  /**
   * Number of drives per node.
   * Only applicable for distributed mode.
   * Defaults to 1
   */
  drivesPerNode?: pulumi.Input<number>;
  /**
   * Configure ingress for minio
   */
  ingress?: abstractions.Ingress;
  /**
   * Configure persistence for minio.
   * Defaults to enabled with 10Gi size.
   */
  persistence?: abstractions.Persistence;
  /**
   * Configure compute resources.
   */
  resources?: abstractions.ComputeResources;
}

export interface MinioBucket {
  /**
   * Bucket name
   */
  name: pulumi.Input<string>;
  /**
   * Bucket access policy
   */
  policy: pulumi.Input<'none' | 'download' | 'upload' | 'public'>;
  /**
   * Purge if the bucket already exists.
   * Defaults to false
   */
  purge?: pulumi.Input<boolean>;
}

export interface MinioOutputs {
  meta: pulumi.Output<abstractions.HelmMeta>;
  accessKey: pulumi.Output<string>;
  secretKey: pulumi.Output<string>;
  serviceName: pulumi.Output<string>;
  servicePort: pulumi.Output<number>;
  ingress?: abstractions.Ingress;
  buckets?: pulumi.Output<MinioBucket[]>;
}

/**
 * @noInheritDoc
 */
export class Minio extends pulumi.ComponentResource implements MinioOutputs {
  readonly meta: pulumi.Output<abstractions.HelmMeta>;
  readonly accessKey: pulumi.Output<string>;
  readonly secretKey: pulumi.Output<string>;
  readonly serviceName: pulumi.Output<string>;
  readonly servicePort: pulumi.OutputInstance<number>;
  readonly ingress?: abstractions.Ingress;
  readonly buckets?: pulumi.Output<MinioBucket[]>;

  constructor(name: string, props?: MinioInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:Minio', name, props, opts);

    this.meta = pulumi.output<abstractions.HelmMeta>({
      chart: 'minio',
      version: props?.version ?? '8.0.0',
      repo: 'https://helm.min.io',
    });

    this.accessKey = pulumi.secret(
      props?.accessKey ??
        new random.RandomPassword(
          `${name}-minio-access-key`,
          {
            length: 20,
            special: false,
          },
          {
            parent: this,
          }
        ).result
    );

    this.secretKey = pulumi.secret(
      props?.secretKey ??
        new random.RandomPassword(
          `${name}-minio-secret-key`,
          {
            length: 40,
            special: false,
          },
          {
            parent: this,
          }
        ).result
    );

    this.serviceName = pulumi.output(name);
    this.servicePort = pulumi.output(80);
    this.ingress = props?.ingress;
    this.buckets = props?.buckets && pulumi.output(props?.buckets);

    const chart = new k8s.helm.v3.Chart(
      name,
      {
        namespace: props?.namespace,
        chart: this.meta.chart,
        version: this.meta.version,
        fetchOpts: {
          repo: this.meta.repo,
        },
        transformations: [
          removeHelmHooks(),
          (obj) => {
            if (obj.kind === 'Deployment') {
              if (!obj.spec.template.metadata.annotations) {
                obj.spec.template.metadata.annotations = {};
              }
              obj.spec.template.metadata.annotations.rollme = '';
            }
          },
        ],
        values: {
          fullnameOverride: name,
          mode: props?.mode ?? 'standalone',
          replicas: props?.replicas ?? 1,
          zones: props?.zones ?? 1,
          drivesPerNode: props?.drivesPerNode ?? 1,
          accessKey: this.accessKey,
          secretKey: this.secretKey,
          buckets: props?.buckets,
          DeploymentUpdate: {
            type: 'Recreate',
          },
          service: {
            port: 80,
          },
          ingress: {
            enabled: props?.ingress?.enabled ?? false,
            annotations: {
              'kubernetes.io/ingress.class': props?.ingress?.class ?? 'nginx',
              'kubernetes.io/tls-acme': props?.ingress?.tls === false ? 'false' : 'true',
              ...props?.ingress?.annotations,
            },
            hosts: props?.ingress?.hosts,
            tls: [
              {
                hosts: props?.ingress?.hosts,
                secretName: `tls-${name}`,
              },
            ],
          },
          persistence: {
            enabled: props?.persistence?.enabled ?? true,
            size: `${props?.persistence?.sizeGB ?? 10}Gi`,
            storageClass: props?.persistence?.storageClass,
          },
          readinessProbe: {
            initialDelaySeconds: 5,
          },
          resources: props?.resources,
          serviceAccount: {
            create: false,
          },
        },
      },
      {
        parent: this,
        provider: props?.provider,
      }
    );

    // Pulumi doesn't correctly support helm hooks yet
    // and this helm chart makes use of them for the "create-bucket"
    // post-install job.
    // We'll instead implement support for ourself.
    // https://github.com/pulumi/pulumi-kubernetes/issues/1335
    if (props?.buckets?.length) {
      new k8s.batch.v1.Job(
        `${name}-make-bucket-job`,
        {
          metadata: {
            name: `${name}-make-bucket-job`,
            namespace: props?.namespace,
            labels: {
              app: 'minio-make-bucket-job',
              chart: pulumi.interpolate`minio-${this.meta.version}`,
              release: name,
              heritage: 'Helm',
            },
          },
          spec: {
            template: {
              metadata: {
                labels: {
                  app: 'minio-job',
                  release: name,
                },
              },
              spec: {
                restartPolicy: 'OnFailure',
                serviceAccountName: name,
                containers: [
                  {
                    name: 'minio-mc',
                    image: 'minio/mc:RELEASE.2020-10-03T02-54-56Z',
                    imagePullPolicy: 'IfNotPresent',
                    command: ['/bin/sh', '/config/initialize'],
                    env: [
                      {
                        name: 'MINIO_ENDPOINT',
                        value: name,
                      },
                      {
                        name: 'MINIO_PORT',
                        value: '80',
                      },
                    ],
                    volumeMounts: [
                      {
                        name: 'minio-configuration',
                        mountPath: '/config',
                      },
                    ],
                    resources: {
                      requests: {
                        memory: '128Mi',
                      },
                    },
                  },
                ],
                volumes: [
                  {
                    name: 'minio-configuration',
                    projected: {
                      sources: [
                        {
                          configMap: {
                            name: name,
                          },
                        },
                        {
                          secret: {
                            name: name,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
        {
          parent: chart,
          provider: props?.provider,
        }
      );
    }
  }
}
