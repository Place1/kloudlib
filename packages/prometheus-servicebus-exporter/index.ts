/**
 * this package is based off https://github.com/marcinbudny/servicebus_exporter
 *
 * @module "@kloudlib/prometheus-servicebus-exporter"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { PrometheusServicebusExporter } from '@kloudlib/prometheus-servicebus-exporter';
 *
 * new PrometheusServicebusExporter('prometheus-servicebus-exporter', {
 *   // ...
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as abstractions from '@kloudlib/abstractions';

export interface PrometheusServicebusExporterInputs {
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
   * defaults to 0.1.0
   */
  version?: string;
  /**
   * the servicebus connection string
   */
  connectionString: pulumi.Input<string>;
  /**
   * resource requests and limits
   * defaults to undefined (no requests or limits)
   */
  resources?: abstractions.ComputeResources;
}

export interface PrometheusServicebusExporterOutputs {

}

/**
 * @noInheritDoc
 */
export class PrometheusServicebusExporter extends pulumi.ComponentResource implements PrometheusServicebusExporterOutputs {

  constructor(name: string, props: PrometheusServicebusExporterInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:PrometheusServicebusExporter', name, props, opts);

    const secret = new k8s.core.v1.Secret(`${name}-secret`, {
      metadata: {
        name: name,
        namespace: props?.namespace,
      },
      stringData: {
        CONNECTION_STRING: props.connectionString,
      },
    }, {
      provider: props?.provider,
    });

    new k8s.apps.v1.Deployment(`${name}-deployment`, {
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
              'prometheus.io/port': '9580',
              'prometheus.io/path': '/metrics',
            },
            labels: {
              app: name,
            },
          },
          spec: {
            containers: [{
              name: 'prometheus-servicebus-exporter',
              image: `awaragi/prometheus-servicebus-exporter:${props?.version ?? '0.1.0'}`,
              envFrom: [{
                secretRef: {
                  name: secret.metadata.name,
                },
              }],
              ports: [{
                name: 'http',
                containerPort: 9580,
              }],
              resources: props.resources,
            }],
          },
        },
      },
    }, {
      provider: props?.provider,
    });
  }

}
