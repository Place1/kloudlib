/**
 * @module "@kloudlib/jaeger"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { Jaeger } from '@kloudlib/jaeger';
 *
 * new Jaeger('jaeger', {
 *   // ...
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as abstractions from '@kloudlib/abstractions';
import * as inputs from "@pulumi/kubernetes/types/input";

export interface JaegerInputs {
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
   * TODO:
   *
   * defaults to kind AllInOne
   */
  mode?: JaegerAllInOneMode | JaegerHelmChartMode;
}

export interface JaegerAllInOneMode {
  kind: 'AllInOne';
  /**
   * the docker image to use
   *
   * defaults to jaegertracing/all-in-one
   */
  image?: pulumi.Input<string>;
  /**
   * ingress resource configuration for the web ui
   *
   * defaults to undefined (no ingress resource will be created)
   */
  ingress?: abstractions.Ingress;
  /**
   * persistent storage configuration
   *
   * defaults to 10GB
   */
  persistence?: abstractions.Persistence;
}

export interface JaegerHelmChartMode {
  kind: 'HelmChart';
  /**
   * The helm chart version
   */
  version?: string;
  /**
   * ingress resource configuration for the web ui
   *
   * defaults to undefined (no ingress resource will be created)
   */
  ingress?: abstractions.Ingress;
  /**
   * persistent storage configuration for cassandra
   *
   * defaults to 10GB
   */
  persistence?: abstractions.Persistence;
  /**
   * configure the cassandra storage cluster
   *
   * these values are tuned for tiny development clusters
   * where resources are limited.
   *
   * tuning is recommended for production deployments.
   */
  cassandra?: {
    /**
     * number of cassandra replicas (either 3 or 10)
     *
     * defaults to 3
     */
    clusterSize?: 3 | 10;
    /**
     * the initial size of the heap (initdb argument)
     *
     * defaults to 256M
     */
    heapNewSize?: string;
    /**
     * the max heapsize for cassandra (initdb argument)
     *
     * defaults to 1024M
     */
    maxHeapSize?: string;
    /**
     * kubernetes resource limits/requests for cassandra pods
     *
     * cassandra demands a high minimum set of resources
     *
     * defaults to cpu=400m and memory=2048Mi
     */
    resources?: abstractions.ComputeResources,
  };
}

export interface JaegerOutputs {}

/**
 * @noInheritDoc
 */
export class Jaeger extends pulumi.ComponentResource implements JaegerOutputs {

  meta?: pulumi.Output<abstractions.HelmMeta>;

  constructor(name: string, props?: JaegerInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:Jaeger', name, props, opts);

    if (name === 'jaeger') {
      throw new Error(
        'The name "jaeger" will result in a' +
          ' kubernetes service discovery environment variables that' +
          ' conflict and break common jaeger clients. It is recommended' +
          ' to use the name "jaeger-tracing" instead:' +
          ' https://github.com/jaegertracing/jaeger/issues/1986'
      );
    }

    switch (props?.mode?.kind ?? 'AllInOne') {
      case 'HelmChart':
        this.helmChart(name, props ?? {}, props?.mode as JaegerHelmChartMode);
        break;
      case 'AllInOne':
        this.allInOne(name, props ?? {}, props?.mode as JaegerAllInOneMode);
        break;
      default:
        throw new Error(`Unknown jaeger deployment mode: ${props?.mode?.kind}`);
    }
  }

  private allInOne(name: string, props: JaegerInputs, mode?: JaegerAllInOneMode) {
    const volumes = new Array<inputs.core.v1.Volume>();

    if (mode?.persistence?.enabled ?? true) {
      const pvc = new k8s.core.v1.PersistentVolumeClaim(
        name,
        {
          metadata: {
            name: name,
            namespace: props?.namespace,
            labels: {
              app: name,
            },
            annotations: {
              ...(mode?.persistence?.storageClass && {
                'volume.beta.kubernetes.io/storage-class': mode?.persistence?.storageClass,
              }),
            },
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: `${mode?.persistence?.sizeGB ?? 10}Gi`,
              },
            },
          },
        },
        {
          parent: this,
          provider: props?.provider,
        }
      );
      volumes.push({
        name: 'data',
        persistentVolumeClaim: {
          claimName: pvc.metadata.name,
        },
      });
    } else {
      volumes.push({
        name: 'data',
        emptyDir: {},
      });
    }

    const deployment = new k8s.apps.v1.Deployment(
      name,
      {
        metadata: {
          name: name,
          namespace: props?.namespace,
          labels: {
            app: name,
          },
        },
        spec: {
          replicas: 1,
          strategy: {
            type: 'Recreate',
          },
          selector: {
            matchLabels: {
              app: name,
            },
          },
          template: {
            metadata: {
              labels: {
                app: name,
              },
            },
            spec: {
              containers: [
                {
                  name: 'jaeger',
                  image: mode?.image ?? 'jaegertracing/all-in-one:1.20',
                  env: [
                    {
                      name: 'SPAN_STORAGE_TYPE',
                      value: 'badger',
                    },
                    {
                      name: 'BADGER_EPHEMERAL',
                      value: 'false',
                    },
                    {
                      name: 'BADGER_DIRECTORY_VALUE',
                      value: '/badger/data',
                    },
                    {
                      name: 'BADGER_DIRECTORY_KEY',
                      value: '/badger/key',
                    },
                  ],
                  ports: [
                    { containerPort: 6831, protocol: 'UDP', name: 'thrift-compact' },
                    { containerPort: 6832, protocol: 'UDP', name: 'thrift-binary' },
                    { containerPort: 16686, protocol: 'TCP', name: 'admin' },
                    { containerPort: 14268, protocol: 'TCP', name: 'thrift' },
                    { containerPort: 14250, protocol: 'TCP', name: 'grpc' },
                    { containerPort: 9411, protocol: 'TCP', name: 'zipkin' },
                  ],
                  volumeMounts: [
                    {
                      name: 'data',
                      mountPath: '/badger',
                    },
                  ],
                },
              ],
              volumes: volumes,
            },
          },
        },
      },
      {
        parent: this,
        provider: props?.provider,
      }
    );

    const service = new k8s.core.v1.Service(
      name,
      {
        metadata: {
          name: name,
          namespace: props?.namespace,
          labels: {
            app: name,
          },
        },
        spec: {
          selector: {
            app: name,
          },
          ports: deployment.spec.template.spec.containers[0].ports.apply((ports) =>
            ports.map((port) => ({
              name: port.name,
              port: port.containerPort,
              targetPort: port.containerPort,
              protocol: port.protocol,
            }))
          ),
        },
      },
      {
        parent: this,
        provider: props?.provider,
      }
    );

    if (mode?.ingress?.enabled) {
      const hosts = pulumi.output(mode?.ingress?.hosts ?? []);
      new k8s.networking.v1beta1.Ingress(name, {
        metadata: {
          name: name,
          namespace: props.namespace,
          labels: {
            app: name,
          },
          annotations: {
            'kubernetes.io/ingress.class': mode.ingress?.class ?? 'nginx',
            'kubernetes.io/tls-acme': 'true',
            ...mode.ingress?.annotations,
          },
        },
        spec: {
          rules: hosts.apply((items: string[]) =>
            items.map((host) => ({
              host: host,
              http: {
                paths: [
                  {
                    path: '/',
                    backend: {
                      serviceName: service.metadata.name,
                      servicePort: 16686,
                    },
                  },
                ],
              },
            }))
          ),
          tls: [
            {
              hosts: hosts,
              secretName: `tls-${name}`,
            },
          ],
        },
      }, {
        provider: props.provider,
      });
    }
  }

  private helmChart(name: string, props: JaegerInputs, mode?: JaegerHelmChartMode) {
    this.meta = pulumi.output<abstractions.HelmMeta>({
      chart: 'jaeger',
      version: mode?.version ?? '0.39.0',
      repo: 'https://jaegertracing.github.io/helm-charts',
    });

    new k8s.helm.v3.Chart(
      name,
      {
        chart: this.meta.chart,
        version: this.meta.version,
        namespace: props?.namespace,
        fetchOpts: {
          repo: this.meta.repo,
        },
        values: {
          query: {
            ingress: {
              enabled: mode?.ingress?.enabled ?? false,
              annotations: {
                'kubernetes.io/ingress.class': mode?.ingress?.class ?? 'nginx',
                'kubernetes.io/tls-acme': mode?.ingress?.tls === false ? 'false' : 'true',
                ...mode?.ingress?.annotations,
              },
              hosts: mode?.ingress?.hosts,
              tls: [
                {
                  hosts: mode?.ingress?.hosts,
                  secretName: `tls-${name}`,
                },
              ],
            }
          },
          cassandra: {
            config: {
              cluster_size: mode?.cassandra?.clusterSize ?? 3,
              heap_new_size: mode?.cassandra?.heapNewSize ?? '256M',
              max_heap_size: mode?.cassandra?.maxHeapSize ?? '1024M',
            },
            resources: {
              requests: {
                cpu: mode?.cassandra?.resources?.requests?.cpu ?? '400m',
                memory: mode?.cassandra?.resources?.requests?.memory ?? '2048Mi',
              },
              limits: {
                cpu: mode?.cassandra?.resources?.limits?.cpu ?? '400m',
                memory: mode?.cassandra?.resources?.limits?.memory ?? '2048Mi',
              },
            },
            persistence: {
              enabled: mode?.persistence?.enabled ?? true,
              size: `${mode?.persistence?.sizeGB ?? 10}Gi`,
              storageClass: mode?.persistence?.storageClass,
            },
            readinessProbe: {
              initialDelaySeconds: 10,
              periodSeconds: 15,
            },
            affinity: {
              podAntiAffinity: {
                preferredDuringSchedulingIgnoredDuringExecution: [
                  {
                    podAffinityTerm: {
                      topologyKey: 'kubernetes.io/hostname',
                      labelSelector: {
                        matchLabels: {
                          app: 'cassandra',
                          release: name,
                        },
                      },
                    },
                    weight: 1,
                  },
                ],
              },
            },
          },
        },
      },
      {
        parent: this,
        provider: props.provider,
      },
    );
  }
}
