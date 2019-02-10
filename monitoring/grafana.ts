import * as pulumi from '@pulumi/kubernetes';
import * as k8s from '@pulumi/kubernetes';

export interface GrafanaOptions {
  provider?: k8s.Provider;
  namespace?: k8s.core.v1.Namespace;
}

export class Grafana extends pulumi.ComponentResource {

}
