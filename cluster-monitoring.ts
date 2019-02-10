import * as pulumi from '@pulumi/pulumi';
import { Cluster } from './cluster';

export interface ClusterMonitoringOptions {
  cluster: Cluster;
}

export class ClusterMonitoring extends pulumi.CustomResource {
  constructor(private name: string, private options: ClusterMonitoringOptions) {
    super('cluster-monitoring', name)
    this.createPrometheus();
    this.createLoki();
    this.createGrafana();
  }

  private createPrometheus() {

  }

  private createLoki() {

  }

  private createGrafana() {

  }
}
