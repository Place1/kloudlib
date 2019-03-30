import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { DockerEnv } from './docker-image';

export interface ICluster {
  isDev(): boolean;
  getDockerEnv(): Promise<DockerEnv>;
  getKubernetesProvider(): k8s.Provider;
  getKubeConfig(): pulumi.Output<string>;
}
