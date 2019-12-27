import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes';
import * as services from '../services';
import { merge } from 'lodash';

interface ServiceInputs { enabled?: boolean }

export interface GrafanaStackInputs {
  provider: k8s.Provider;
  grafana?: services.GrafanaInputs & ServiceInputs;
  prometheus?: services.PrometheusInputs & ServiceInputs;
  loki?: services.LokiInputs & ServiceInputs;
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

    const defaults: Partial<GrafanaStackInputs> = {
      grafana: {
        enabled: true,
        provider: props.provider,
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
          sizeGB: 1,
        },
      },
      loki: {
        enabled: true,
        provider: props.provider,
        persistence: {
          sizeGB: 10,
        },
      },
      prometheus: {
        enabled: true,
        provider: props.provider,
        persistence: {
          sizeGB: 10,
        },
      },
    };

    props = merge(defaults, props);

    if (props.grafana?.enabled) {
      this.grafana = new services.Grafana('grafana', props.grafana, { parent: this });
    }

    if (props.loki?.enabled) {
      this.loki = new services.Loki('loki', props.loki, { parent: this });
    }

    if (props.prometheus) {
      this.prometheus = new services.Prometheus('prometheus', props.prometheus, { parent: this });
    }
  }
}
