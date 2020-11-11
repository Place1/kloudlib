/**
 * @module "@kloudlib/prometheus"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { Prometheus } from '@kloudlib/prometheus';
 *
 * new Prometheus('prometheus', {
 *   // ...
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as abstractions from '@kloudlib/abstractions';

export interface PrometheusInputs {
  provider?: k8s.Provider;
  namespace?: pulumi.Input<string>;
  /**
   * the helm chart version
   */
  version?: string;
  /**
   * how often prometheus should scrape metrics
   * defaults to 60
   */
  scrapeIntervalSeconds?: number;
  /**
   * the retention time for recorded metrics in hours
   * defaults to 7 days
   */
  retentionHours?: number;
  /**
   * extra cli flags with values for prometheus
   */
  extraArgs?: Record<string, string>;
  /**
   * extra cli flags for prometheus
   */
  extraFlags?: string[];
  /**
   * configure alertmanager
   * defaults to enabled
   */
  alertmanager?: {
    enabled?: boolean;
  };
  /**
   * configure nodeExporter
   * defaults to enabled
   */
  nodeExporter?: {
    enabled?: boolean;
  };
  /**
   * configure kubeStateMetrics
   * defaults to enabled
   */
  kubeStateMetrics?: {
    enabled?: boolean;
  };
  /**
   * configure pushgateway
   * defaults to disabled
   */
  pushgateway?: {
    enabled?: boolean;
  };
  persistence?: abstractions.Persistence;
  resources?: abstractions.ComputeResources;
}

export interface PrometheusOutputs {
  meta: pulumi.Output<abstractions.HelmMeta>;
  persistence: pulumi.Output<abstractions.Persistence | undefined>;
}

/**
 * @noInheritDoc
 */
export class Prometheus extends pulumi.ComponentResource implements PrometheusOutputs {
  readonly meta: pulumi.Output<abstractions.HelmMeta>;
  readonly persistence: pulumi.Output<abstractions.Persistence | undefined>;

  constructor(name: string, props?: PrometheusInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:Prometheus', name, props, opts);

    this.persistence = pulumi.output(props?.persistence);

    this.meta = pulumi.output<abstractions.HelmMeta>({
      chart: 'prometheus',
      version: props?.version ?? '11.16.8',
      repo: 'https://prometheus-community.github.io/helm-charts',
    });

    // https://github.com/helm/charts/tree/master/stable/prometheus
    const prometheus = new k8s.helm.v3.Chart(
      name,
      {
        namespace: props?.namespace,
        chart: this.meta.chart,
        version: this.meta.version,
        fetchOpts: {
          repo: this.meta.repo,
        },
        values: {
          // https://github.com/helm/charts/blob/master/stable/prometheus/values.yaml
          global: {
            scrape_interval: `${props?.scrapeIntervalSeconds ?? 60}s`,
          },
          server: {
            retention: pulumi.interpolate`${props?.retentionHours || 168}h`,
            strategy: {
              type: 'Recreate',
            },
            extraArgs: props?.extraArgs,
            extraFlags: ['storage.tsdb.wal-compression', ...(props?.extraFlags || [])],
            persistentVolume: !props?.persistence
              ? { enabled: false }
              : {
                  enabled: props?.persistence.enabled,
                  size: pulumi.interpolate`${props?.persistence.sizeGB}Gi`,
                  storageClass: props?.persistence.storageClass,
                },
            resources: props?.resources
              ? props?.resources
              : {
                  requests: {
                    cpu: '300m',
                    memory: '1000M',
                  },
                  limits: {
                    cpu: '2',
                    memory: '1500M',
                  },
                },
          },
          alertmanager: {
            enabled: props?.alertmanager?.enabled ?? true,
            persistentVolume: {
              enabled: false,
            },
          },
          nodeExporter: {
            enabled: props?.nodeExporter?.enabled ?? true,
          },
          kubeStateMetrics: {
            enabled: props?.kubeStateMetrics?.enabled ?? true,
          },
          pushgateway: {
            enabled: props?.pushgateway?.enabled ?? false,
          },
        },
      },
      {
        parent: this,
        provider: props?.provider,
      }
    );
  }
}
