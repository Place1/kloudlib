import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes';
import * as services from '.';
import { merge } from 'lodash';

interface ServiceInputs { enabled?: boolean }

export interface GrafanaStackInputs {
  provider?: k8s.Provider;
  namespace?: pulumi.Input<string>;
  grafana?: Partial<services.GrafanaInputs> & ServiceInputs;
  prometheus?: Partial<services.PrometheusInputs> & ServiceInputs;
  loki?: Partial<services.LokiInputs> & ServiceInputs;
}

export interface GrafanaStackOutputs {
  grafana?: services.GrafanaOutputs;
  prometheus?: services.PrometheusOutputs;
  loki?: services.LokiOutputs;
}

export class GrafanaStack extends pulumi.ComponentResource implements GrafanaStackOutputs {

  readonly grafana?: services.GrafanaOutputs;
  readonly prometheus?: services.PrometheusOutputs;
  readonly loki?: services.LokiOutputs;

  constructor(name: string, props: GrafanaStackInputs, opts?: pulumi.CustomResourceOptions) {
    super('GrafanaStack', name, props, opts);

    const defaults = {
      grafana: {
        enabled: true,
        provider: props.provider,
        namespace: props.namespace,
        datasources: [{
          name: 'prometheus',
          type: 'prometheus',
          url: 'http://prometheus-server',
        }, {
          name: 'loki',
          type: 'loki',
          url: 'http://loki:3100',
        }],
        persistence: {
          enabled: true,
          sizeGB: 1,
        },
      },
      loki: {
        enabled: true,
        provider: props.provider,
        namespace: props.namespace,
        persistence: {
          enabled: true,
          sizeGB: 10,
        },
      },
      prometheus: {
        enabled: true,
        provider: props.provider,
        namespace: props.namespace,
        persistence: {
          enabled: true,
          sizeGB: 10,
        },
      },
    };

    if (props.grafana?.enabled !== false) {
      this.grafana = new services.Grafana('grafana', merge({}, defaults.grafana, props.grafana), { parent: this });
    }

    if (props.loki?.enabled !== false) {
      this.loki = new services.Loki('loki', merge({}, defaults.loki, props.loki), { parent: this });
    }

    if (props.prometheus?.enabled !== false) {
      this.prometheus = new services.Prometheus('prometheus', merge({}, defaults.prometheus, props.prometheus), { parent: this });
    }
  }
}
