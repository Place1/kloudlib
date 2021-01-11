/**
 * @module "@kloudlib/loki"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { Loki } from '@kloudlib/loki';
 *
 * new Loki('loki', {
 *   // ...
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as abstractions from '@kloudlib/abstractions';
import { removeHelmTests } from '@kloudlib/utils';

export interface LokiInputs {
  provider?: k8s.Provider;
  namespace?: pulumi.Input<string>;
  /**
   * the helm chart version
   */
  version?: string;
  /**
   * the retention time for recorded logs in hours
   * defaults to 7 days
   */
  retentionHours?: number;
  /**
   * Enable systemd-journal support.
   * https://grafana.com/docs/loki/latest/clients/promtail/configuration/#journal
   */
  scrapeSystemdJournal?: boolean;
  /**
   * Data persistence for loki's log database
   */
  persistence?: abstractions.Persistence;
  /**
   * Pod resource request/limits
   */
  resources?: abstractions.ComputeResources;
}

export interface LokiOutputs {
  meta: pulumi.Output<abstractions.HelmMeta>;
  clusterUrl: pulumi.Output<string>;
  persistence: pulumi.Output<abstractions.Persistence | undefined>;
}

/**
 * @noInheritDoc
 */
export class Loki extends pulumi.ComponentResource implements LokiOutputs {
  readonly meta: pulumi.Output<abstractions.HelmMeta>;
  readonly clusterUrl: pulumi.Output<string>;
  readonly persistence: pulumi.Output<abstractions.Persistence | undefined>;

  constructor(name: string, props?: LokiInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:Loki', name, props, opts);

    this.persistence = pulumi.output(props?.persistence);

    this.clusterUrl = pulumi.output('http://loki:3100');

    this.meta = pulumi.output<abstractions.HelmMeta>({
      chart: 'loki-stack',
      version: props?.version ?? '2.0.2',
      repo: 'https://grafana.github.io/loki/charts',
    });

    const loki = new k8s.helm.v3.Chart(
      name,
      {
        namespace: props?.namespace,
        chart: this.meta.chart,
        version: this.meta.version,
        fetchOpts: {
          repo: this.meta.repo,
        },
        transformations: [removeHelmTests()],
        values: {
          loki: {
            persistence: !props?.persistence
              ? { enabled: false }
              : {
                  enabled: props?.persistence.enabled,
                  size: pulumi.interpolate`${props?.persistence.sizeGB}Gi`,
                  storageClassName: props?.persistence.storageClass,
                },
            readinessProbe: {
              initialDelaySeconds: 10,
            },
            resources: props?.resources,
            config: {
              table_manager: {
                retention_deletes_enabled: true,
                retention_period: pulumi.interpolate`${props?.retentionHours || 168}h`,
              },
              schema_config: {
                configs: [
                  {
                    from: '2018-04-15',
                    store: 'boltdb',
                    object_store: 'filesystem',
                    schema: 'v9',
                    index: {
                      prefix: 'index_',
                      period: '168h',
                    },
                  },
                ],
              },
              storage_config: {
                boltdb: {
                  directory: '/data/loki/index',
                },
                filesystem: {
                  directory: '/data/loki/chunks',
                },
              },
            },
          },
          promtail: props?.scrapeSystemdJournal && {
            extraScrapeConfigs: [
              {
                job_name: 'journal',
                journal: {
                  path: '/var/log/journal',
                  max_age: '12h',
                  labels: {
                    job: 'systemd-journal',
                  },
                },
                relabel_configs: [
                  {
                    source_labels: ['__journal__systemd_unit'],
                    target_label: 'unit',
                  },
                  {
                    source_labels: ['__journal__hostname'],
                    target_label: 'hostname',
                  },
                ],
              },
            ],
            extraVolumes: [
              {
                name: 'journal',
                hostPath: {
                  path: '/var/log/journal',
                },
              },
            ],
            extraVolumeMounts: [
              {
                name: 'journal',
                mountPath: '/var/log/journal',
                readOnly: true,
              },
            ],
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
