/**
 * @module "@kloudlib/prometheus-mssql-exporter"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { PrometheusMSSQLExporter } from '@kloudlib/prometheus-mssql-exporter';
 *
 * new PrometheusMSSQLExporter('prometheus-mssql-exporter', {
 *   // ...
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as abstractions from '@kloudlib/abstractions';

export interface PrometheusMSSQLExporterInputs {
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
   * defaults to v0.4.1
   */
  version?: string;
  /**
   * the mssql server hostname or IP
   * e.g. 1.2.3.4 or example.com
   */
  host: pulumi.Input<string>;
  /**
   * the mssql server port
   * defaults to 1443
   */
  port?: pulumi.Input<string>;
  /**
   * the mssql server username
   */
  username: pulumi.Input<string>;
  /**
   * the mssql server password
   */
  password: pulumi.Input<string>;
  /**
   * resource requests and limits
   * defaults to undefined (no requests or limits)
   */
  resources?: abstractions.ComputeResources;
}

export interface PrometheusMSSQLExporterOutputs {}

/**
 * @noInheritDoc
 */
export class PrometheusMSSQLExporter extends pulumi.ComponentResource implements PrometheusMSSQLExporterOutputs {
  constructor(name: string, props: PrometheusMSSQLExporterInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:PrometheusMSSQLExporter', name, props, opts);

    const secret = new k8s.core.v1.Secret(
      `${name}-secret`,
      {
        metadata: {
          name: name,
          namespace: props?.namespace,
        },
        stringData: {
          SERVER: props.host,
          PORT: props.port ?? '1443',
          USERNAME: props.username,
          PASSWORD: props.password,
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
                'prometheus.io/port': '4000',
                'prometheus.io/path': '/metrics',
              },
              labels: {
                app: name,
              },
            },
            spec: {
              containers: [
                {
                  name: 'prometheus-mssql-exporter',
                  image: `awaragi/prometheus-mssql-exporter:${props?.version ?? 'v0.4.1'}`,
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
                      containerPort: 4000,
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
