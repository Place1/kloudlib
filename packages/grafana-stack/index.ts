/**
 * @module "@kloudlib/grafana-stack"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { GrafanaStack } from '@kloudlib/grafana-stack';
 *
 * new GrafanaStack('grafana-stack', {
 *   // ...
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as grafana from '@kloudlib/grafana';
import * as prometheus from '@kloudlib/prometheus';
import * as loki from '@kloudlib/loki';
import { merge } from 'lodash';

interface ServiceInputs {
  enabled?: boolean;
}

export interface GrafanaStackInputs {
  provider?: k8s.Provider;
  namespace?: pulumi.Input<string>;
  grafana?: Partial<grafana.GrafanaInputs> & ServiceInputs;
  prometheus?: Partial<prometheus.PrometheusInputs> & ServiceInputs;
  loki?: Partial<loki.LokiInputs> & ServiceInputs;
}

export interface GrafanaStackOutputs {
  grafana?: grafana.GrafanaOutputs;
  prometheus?: prometheus.PrometheusOutputs;
  loki?: loki.LokiOutputs;
}

/**
 * @noInheritDoc
 */
export class GrafanaStack extends pulumi.ComponentResource implements GrafanaStackOutputs {
  readonly grafana?: grafana.GrafanaOutputs;
  readonly prometheus?: prometheus.PrometheusOutputs;
  readonly loki?: loki.LokiOutputs;

  constructor(name: string, props?: GrafanaStackInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:GrafanaStack', name, props, opts);

    const defaults = {
      grafana: {
        enabled: true,
        provider: props?.provider,
        namespace: props?.namespace,
        datasources: [
          {
            name: 'prometheus',
            type: 'prometheus',
            url: 'http://prometheus-server',
          },
          {
            name: 'loki',
            type: 'loki',
            url: 'http://loki:3100',
          },
        ],
        persistence: {
          enabled: true,
          sizeGB: 1,
        },
      },
      loki: {
        enabled: true,
        provider: props?.provider,
        namespace: props?.namespace,
        persistence: {
          enabled: true,
          sizeGB: 10,
        },
      },
      prometheus: {
        enabled: true,
        provider: props?.provider,
        namespace: props?.namespace,
        persistence: {
          enabled: true,
          sizeGB: 10,
        },
      },
    };

    if (props?.grafana?.enabled !== false) {
      props?.grafana?.dashboards?.forEach((dashboard: any) => {
        if (dashboard?.gnetId !== undefined && dashboard?.datasource === undefined) {
          dashboard.datasource = 'prometheus';
        }
      });
      this.grafana = new grafana.Grafana('grafana', merge({}, defaults.grafana, props?.grafana), { parent: this });
    }

    if (props?.loki?.enabled !== false) {
      this.loki = new loki.Loki('loki', merge({}, defaults.loki, props?.loki), { parent: this });
    }

    if (props?.prometheus?.enabled !== false) {
      this.prometheus = new prometheus.Prometheus('prometheus', merge({}, defaults.prometheus, props?.prometheus), {
        parent: this,
      });
    }
  }
}
