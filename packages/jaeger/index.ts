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
   * Deploy the jaeger all-in-one container which
   * is suitable for non-production use-cases.
   */
  allInOne?: boolean;
}

export interface JaegerOutputs {}

/**
 * @noInheritDoc
 */
export class Jaeger extends pulumi.ComponentResource implements JaegerOutputs {
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

    if (props?.allInOne) {
      this.allInOne(name, props);
    } else {
      this.helmChart(name, props);
    }
  }

  private allInOne(name: string, props?: JaegerInputs) {
    const pvc = new k8s.core.v1.PersistentVolumeClaim(
      name,
      {
        metadata: {
          name: name,
          namespace: props?.namespace,
        },
        spec: {
          accessModes: ['ReadWriteOnce'],
          resources: {
            requests: {
              storage: '1Gi',
            },
          },
        },
      },
      {
        parent: this,
        provider: props?.provider,
      }
    );

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
                  image: 'jaegertracing/all-in-one:1.19',
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
              volumes: [
                {
                  name: 'data',
                  persistentVolumeClaim: {
                    claimName: pvc.metadata.name,
                  },
                },
              ],
            },
          },
        },
      },
      {
        parent: this,
        provider: props?.provider,
      }
    );

    new k8s.core.v1.Service(
      name,
      {
        metadata: {
          name: name,
          namespace: props?.namespace,
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
  }

  private helmChart(name: string, props?: JaegerInputs) {
    new k8s.helm.v3.Chart(
      name,
      {
        chart: 'jaeger',
        // version:
        namespace: props?.namespace,
        fetchOpts: {
          repo: 'https://jaegertracing.github.io/helm-charts',
        },
        values: {
          cassandra: {
            config: {
              max_heap_size: '1024M',
              heap_new_size: '256M',
            },
            resources: {
              requests: {
                cpu: '0.4',
                memory: '2045Mi',
              },
              limits: {
                cpu: '0.4',
                memory: '2045Mi',
              },
            },
            persistence: {
              enabled: true,
              size: '1Gi',
            },
          },
        },
      },
      {
        parent: this,
      }
    );
  }
}
