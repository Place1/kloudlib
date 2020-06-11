/**
 * @module "@kloudlib/prometheus-postgresql-exporter"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { PrometheusPostgreSQLExporter } from '@kloudlib/prometheus-postgresql-exporter';
 *
 * new PrometheusPostgreSQLExporter('prometheus-postgresql-exporter', {
 *   // ...
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as abstractions from '@kloudlib/abstractions';

export interface PrometheusPostgreSQLExporterInputs {
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
   * defaults to v0.8.0
   */
  version?: string;
  /**
   * the postgresql server hostname or IP
   * e.g. 1.2.3.4 or example.com
   */
  host: pulumi.Input<string>;
  /**
   * set the sslmode of the connection string
   * defaults to 'disable'
   */
  sslmode?: pulumi.Input<'disable' | 'require' | 'verify-ca' | 'verify-full'>;
  /**
   * the postgresql server port
   * defaults to 5432
   */
  port?: pulumi.Input<string>;
  /**
   * the postgresql server username
   */
  username: pulumi.Input<string>;
  /**
   * the postgresql server password
   */
  password: pulumi.Input<string>;
  /**
   * resource requests and limits
   * defaults to undefined (no requests or limits)
   */
  resources?: abstractions.ComputeResources;
}

export interface PrometheusPostgreSQLExporterOutputs {}

/**
 * @noInheritDoc
 */
export class PrometheusPostgreSQLExporter extends pulumi.ComponentResource
  implements PrometheusPostgreSQLExporterOutputs {
  constructor(name: string, props: PrometheusPostgreSQLExporterInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:PrometheusPostgreSQLExporter', name, props, opts);

    const secret = new k8s.core.v1.Secret(
      `${name}-secret`,
      {
        metadata: {
          name: name,
          namespace: props?.namespace,
        },
        stringData: {
          DATA_SOURCE_URI: pulumi.interpolate`${props.host}:${props.port ?? '5432'}?sslmode=${
            props.sslmode ?? 'disable'
          }`,
          DATA_SOURCE_USER: props.username,
          DATA_SOURCE_PASS: props.password,
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
                'prometheus.io/port': '9187',
                'prometheus.io/path': '/metrics',
              },
              labels: {
                app: name,
              },
            },
            spec: {
              containers: [
                {
                  name: 'prometheus-postgresql-exporter',
                  image: `wrouesnel/postgres_exporter:${props?.version ?? 'v0.8.0'}`,
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
                      containerPort: 9187,
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
