import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes'
import * as basics from './basics';
import { makename } from '../pulumi';

export interface PrometheusInputs {
  provider: k8s.Provider;
  // the retention time for recorded metrics in hours
  // defaults to 7 days
  retentionHours?: number;
  persistence?: basics.Persistence;
  resources?: basics.ComputeResources;
}

export interface PrometheusOutputs {
  persistence: pulumi.Output<basics.Persistence | undefined>;
}

export class Prometheus extends pulumi.CustomResource implements PrometheusOutputs {

  readonly persistence: pulumi.Output<basics.Persistence | undefined>;

  constructor(name: string, props: PrometheusInputs, opts?: pulumi.CustomResourceOptions) {
    super(makename('Prometheus'), name, props, opts);

    this.persistence = pulumi.output(props.persistence);

    // https://github.com/helm/charts/tree/master/stable/prometheus
    const prometheus = new k8s.helm.v2.Chart('prometheus', {
      chart: 'stable/prometheus',
      version: '9.3.1',  // 2.13.1 app version
      values: {
        // https://github.com/helm/charts/blob/master/stable/prometheus/values.yaml
        server: {
          retention: pulumi.interpolate`${props.retentionHours || 168}h`,
          strategy: {
            type: 'Recreate'
          },
          extraArgs: {
            'query.max-samples': '5000000',
            'query.timeout': '6s',
          },
          persistentVolume: !props.persistence ? { enabled : false } : {
            enabled: props.persistence.enabled,
            size: pulumi.interpolate`${props.persistence.sizeGB}Gi`,
            storageClass: props.persistence.storageClass,
          },
          resources: props.resources ? props.resources : {
            requests: {
              cpu: '200m',
              memory: '1000M',
            },
            limits: {
              cpu: '4',
              memory: '1500M',
            },
          },
        },
        alertmanager: {
          enabled: true,
          persistentVolume: {
            enabled: false,
          },
        },
        nodeExporter: {
          enabled: true,
        },
        kubeStateMetrics: {
          enabled: true,
        },
        pushgateway: {
          enabled: false,
        },
      },
    },
    {
      providers: {
        kubernetes: props.provider,
      },
    });
  }
}
