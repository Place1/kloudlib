/**
 * This package is based off https://github.com/oliver006/redis_exporter
 *
 * @module "@kloudlib/prometheus-redis-exporter"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { PrometheusRedisExporter } from '@kloudlib/prometheus-redis-exporter';
 *
 * new PrometheusRedisExporter('prometheus-redis-exporter', {
 *   // ...
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as abstractions from '@kloudlib/abstractions';

export interface PrometheusRedisExporterInputs {
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
   * defaults to v1.6.1-alpine
   */
  version?: string;
  /**
   * the redis server hostname or IP
   * e.g. 1.2.3.4 or example.com
   */
  host: pulumi.Input<string>;
  /**
   * if the redis server uses ssl
   * defaults to false
   */
  ssl?: pulumi.Input<boolean>;
  /**
   * the redis server port
   * defaults to 6379
   */
  port?: pulumi.Input<string>;
  /**
   * the redis server password
   */
  password: pulumi.Input<string>;
  /**
   * resource requests and limits
   * defaults to undefined (no requests or limits)
   */
  resources?: abstractions.ComputeResources;
}

export interface PrometheusRedisExporterOutputs {}

/**
 * @noInheritDoc
 */
export class PrometheusRedisExporter extends pulumi.ComponentResource implements PrometheusRedisExporterOutputs {
  constructor(name: string, props: PrometheusRedisExporterInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:PrometheusRedisExporter', name, props, opts);

    const scheme = props.ssl ? 'rediss' : 'redis';

    const secret = new k8s.core.v1.Secret(
      `${name}-secret`,
      {
        metadata: {
          name: name,
          namespace: props?.namespace,
        },
        stringData: {
          REDIS_ADDR: pulumi.interpolate`${scheme}://${props.host}:${props.port ?? '6379'}`,
          REDIS_PASSWORD: props.password,
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
                'prometheus.io/port': '9121',
                'prometheus.io/path': '/metrics',
              },
              labels: {
                app: name,
              },
            },
            spec: {
              containers: [
                {
                  name: 'prometheus-redis-exporter',
                  image: `oliver006/redis_exporter:${props?.version ?? 'v1.6.1-alpine'}`,
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
                      containerPort: 9121,
                    },
                  ],
                  resources: props.resources,
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
