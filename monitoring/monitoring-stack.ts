import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { Prometheus } from './prometheus';
import { Loki } from './loki';
import { Promtail } from './promtail';
import { Grafana } from './grafana';

export interface MonitoringStackOptions {
  provider?: k8s.Provider;
  namespace?: k8s.core.v1.Namespace;
}

export class MonitoringStack extends pulumi.ComponentResource {

  namespace: k8s.core.v1.Namespace;
  prometheus: Prometheus;
  loki: Loki;
  promtail: Promtail;
  grafana: Grafana;

  constructor(name: string, options: MonitoringStackOptions = {}) {
    super('MonitoringStack', name);

    this.namespace = options.namespace || k8s.core.v1.Namespace.get(`${name}-namespace`, 'default', { parent: this });

    this.prometheus = new Prometheus('prometheus', {
      namespace: this.namespace,
    }, { parent: this });

    this.loki = new Loki('loki', {
      namespace: this.namespace,
    }, { parent: this });

    this.promtail = new Promtail('promtail', {
      namespace: this.namespace,
      loki: this.loki,
    }, { parent: this });

    this.grafana = new Grafana('grafana', {
      namespace: this.namespace,
      prometheus: this.prometheus,
      loki: this.loki,
    }, { parent: this });
  }
}
