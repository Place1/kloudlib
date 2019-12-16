import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes'
import * as basics from './basics';
import { makename } from '../pulumi';

export interface LokiInputs {
  provider: k8s.Provider;
  // the retention time for recorded logs in hours
  // defaults to 7 days
  retentionHours?: number;
  persistence?: basics.Persistence;
}

export interface LokiOutputs {
  clusterUrl: pulumi.Output<string>;
  persistence: pulumi.Output<basics.Persistence | undefined>;
}

export class Loki extends pulumi.CustomResource implements LokiOutputs {

  readonly clusterUrl: pulumi.Output<string>;
  readonly persistence: pulumi.Output<basics.Persistence | undefined>;

  constructor(name: string, props: LokiInputs, opts?: pulumi.CustomResourceOptions) {
    super(makename('Loki'), name, props, opts);

    this.persistence = pulumi.output(props.persistence);

    this.clusterUrl = pulumi.output('http://loki:3100');

    // https://github.com/grafana/loki/tree/master/production/helm/loki-stack
    const loki = new k8s.helm.v2.Chart('loki', {
      chart: 'loki-stack',
      version: '0.20.0', // app version v1.0.0
      fetchOpts: {
        repo: 'https://grafana.github.io/loki/charts',
      },
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
      providers: {
        kubernetes: props.provider,
      },
    });

  }
}
