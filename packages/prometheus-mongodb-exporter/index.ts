/**
 * this package is based off https://github.com/percona/mongodb_exporter
 *
 * @module "@kloudlib/prometheus-mongodb-exporter"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { PrometheusMongoDBExporter } from '@kloudlib/prometheus-mongodb-exporter';
 *
 * new PrometheusMongoDBExporter('prometheus-mongodb-exporter', {
 *   // ...
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as abstractions from '@kloudlib/abstractions';

export interface PrometheusMongoDBExporterInputs {
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
   * the docker image tag to use.
   * defaults to 0.11.0
   */
  version?: string;
  /**
   * the mongodb connection string
   * i.e. mongodb://localhost:27017
   */
  connectionString: pulumi.Input<string>;
  /**
   * resource requests and limits
   * defaults to undefined (no requests or limits)
   */
  resources?: abstractions.ComputeResources;
}

export interface PrometheusMongoDBExporterOutputs {}

/**
 * @noInheritDoc
 */
export class PrometheusMongoDBExporter extends pulumi.ComponentResource implements PrometheusMongoDBExporterOutputs {
  constructor(name: string, props: PrometheusMongoDBExporterInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:PrometheusMongoDBExporter', name, props, opts);

    const secret = new k8s.core.v1.Secret(
      `${name}-secret`,
      {
        metadata: {
          name: name,
          namespace: props?.namespace,
        },
        stringData: {
          MONGODB_URI: props.connectionString,
        },
      },
      {
        provider: props?.provider,
      }
    );

    new k8s.apps.v1.Deployment(
      `${name}-deployment`,
      {
        metadata: {
          name: name,
          namespace: props?.namespace,
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              app: name,
            },
          },
          template: {
            metadata: {
              annotations: {
                'prometheus.io/scrape': 'true',
                'prometheus.io/port': '9216',
                'prometheus.io/path': '/metrics',
              },
              labels: {
                app: name,
              },
            },
            spec: {
              containers: [
                {
                  name: 'prometheus-mongodb-exporter',
                  image: `ssheehy/mongodb-exporter:${props?.version ?? '0.11.0'}`,
                  envFrom: [
                    {
                      secretRef: {
                        name: secret.metadata.name,
                      },
                    },
                  ],
                  ports: [
                    {
                      name: 'http',
                      containerPort: 9216,
                    },
                  ],
                  resources: props.resources as any,
                },
              ],
            },
          },
        },
      },
      {
        provider: props?.provider,
      }
    );
  }
}
