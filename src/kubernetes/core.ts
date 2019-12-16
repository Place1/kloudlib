import * as pulumi from '@pulumi/pulumi'
import * as services from './services';
import { makename } from '../pulumi';

interface ServiceInputs { enabled?: boolean }

export interface CoreInputs {
  certManager?: services.CertManagerInputs & ServiceInputs;
  grafana?: services.GrafanaInputs & ServiceInputs;
  prometheus?: services.PrometheusInputs & ServiceInputs;
  loki?: services.LokiInputs & ServiceInputs;
  nginxIngress?: services.NginxIngressInputs & ServiceInputs;
  openPolicyAgent?: services.OpenPolicyAgentInputs & ServiceInputs;
}

export interface CoreOutputs {

}

export class Core extends pulumi.CustomResource implements CoreOutputs {
  constructor(name: string, props: CoreInputs, opts?: pulumi.CustomResourceOptions) {
    super(makename('Core'), name, props, opts);
  }
}
