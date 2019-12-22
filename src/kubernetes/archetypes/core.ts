import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes';
import * as services from '../services';
import merge from 'lodash.merge';
import { makename } from '../pulumi';

interface ServiceInputs { enabled?: boolean }

export interface CoreInputs {
  provider: k8s.Provider;
  namespace?: k8s.core.v1.Namespace;
  certManager?: services.CertManagerInputs & ServiceInputs;
  grafana?: services.GrafanaInputs & ServiceInputs;
  prometheus?: services.PrometheusInputs & ServiceInputs;
  loki?: services.LokiInputs & ServiceInputs;
  nginxIngress?: services.NginxIngressInputs & ServiceInputs;
}

export interface CoreOutputs {
  certManager?: services.CertManagerOutputs;
  grafana?: services.GrafanaOutputs;
  prometheus?: services.PrometheusOutputs;
  loki?: services.LokiOutputs;
  nginxIngress?: services.NginxIngressOutputs;
}

export class Core extends pulumi.CustomResource implements CoreOutputs {

  readonly certManager?: services.CertManagerOutputs;
  readonly grafana?: services.GrafanaOutputs;
  readonly prometheus?: services.PrometheusOutputs;
  readonly loki?: services.LokiOutputs;
  readonly nginxIngress?: services.NginxIngressOutputs;

  constructor(name: string, props: CoreInputs, opts?: pulumi.CustomResourceOptions) {
    super(makename('Core'), name, props, opts);

    const defaults: Partial<CoreInputs> = {
      certManager: {
        enabled: true,
        provider: props.provider,
        acme: {
          email: 'admin@example.com',
        },
        useStagingACME: false,
      },
      nginxIngress: {
        enabled: true,
        provider: props.provider,
        mode: {
          deployment: true,
          replicas: 2,
        },
      },
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

    if (!props.namespace) {
      props.namespace = new k8s.core.v1.Namespace('namespace', {
        metadata: {
          name: 'core',
        },
      }, {
        provider: props.provider,
        parent: this,
      });
    }

    if (props.certManager?.enabled) {
      this.certManager = new services.CertManager('cert-manager', props.certManager, { parent: this });
    }

    if (props.nginxIngress?.enabled) {
      this.nginxIngress = new services.NginxIngress('nginx-ingress', props.nginxIngress, { parent: this });
    }

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
