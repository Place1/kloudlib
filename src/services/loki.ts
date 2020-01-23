import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes'
import * as basics from './basics';
import { removeHelmTests } from '../transformations';

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
   * Data persistence for loki's log database
   */
  persistence?: basics.Persistence;
}

export interface LokiOutputs {
  meta: pulumi.Output<basics.HelmMeta>;
  clusterUrl: pulumi.Output<string>;
  persistence: pulumi.Output<basics.Persistence | undefined>;
}

export class Loki extends pulumi.ComponentResource implements LokiOutputs {

  readonly meta: pulumi.Output<basics.HelmMeta>;
  readonly clusterUrl: pulumi.Output<string>;
  readonly persistence: pulumi.Output<basics.Persistence | undefined>;

  constructor(name: string, props: LokiInputs, opts?: pulumi.CustomResourceOptions) {
    super('Loki', name, props, opts);

    this.persistence = pulumi.output(props.persistence);

    this.clusterUrl = pulumi.output('http://loki:3100');

    this.meta = pulumi.output<basics.HelmMeta>({
      chart: 'loki-stack',
      version: props.version ?? '0.24.0',
      repo: 'https://grafana.github.io/loki/charts',
    });

    const loki = new k8s.helm.v2.Chart('loki', {
      namespace: props.namespace,
      chart: this.meta.chart,
      version: this.meta.version,
      fetchOpts: {
        repo: this.meta.repo,
      },
      transformations: [removeHelmTests()],
      values: {
        loki: {
          persistence: !props.persistence ? { enabled: false } : {
            enabled: props.persistence.enabled,
            size: pulumi.interpolate`${props.persistence.sizeGB}Gi`,
            storageClassName: props.persistence.storageClass,
          },
          config: {
            table_manager: {
              retention_deletes_enabled: true,
              retention_period: pulumi.interpolate`${props.retentionHours || 168}h`,
            },
          },
        },
      },
    }, {
      parent: this,
      providers: props.provider ? {
        kubernetes: props.provider,
      } : {},
    });

  }
}
