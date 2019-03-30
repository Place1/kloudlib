import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { ICluster } from './icluster';
import { URL } from 'url';
import path from 'path';
import fs from 'fs';
import { DockerEnv } from './docker-image';
import { exec } from '../utils/exec';

export class Minikube implements ICluster {

  private provider = new k8s.Provider('minikube', {
    context: 'minikube',
  });

  getKubernetesProvider(): k8s.Provider {
    return this.provider;
  }

  getKubeConfig(): pulumi.Output<string> {
    throw new Error("Method not implemented.");
  }

  isDev() {
    return true;
  }

  async getDockerEnv() {
    return getMinikubeDockerEnv();
  }
}

export async function getMinikubeDockerEnv(): Promise<DockerEnv> {
  const { stdout } = await exec('minikube docker-env --shell none');
  const env = {
    DOCKER_TLS_VERIFY: '',
    DOCKER_HOST: '',
    DOCKER_CERT_PATH: '',
    DOCKER_API_VERSION: '',
  };
  stdout.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    (env as any)[key] = value;
  });
  const host = new URL(env.DOCKER_HOST);
  return {
    host: host.hostname,
    port: Number(host.port),
    ca: fs.readFileSync(path.join(env.DOCKER_CERT_PATH, 'ca.pem')).toString('utf8'),
    cert: fs.readFileSync(path.join(env.DOCKER_CERT_PATH, 'cert.pem')).toString('utf8'),
    key: fs.readFileSync(path.join(env.DOCKER_CERT_PATH, 'key.pem')).toString('utf8'),
  };
}
