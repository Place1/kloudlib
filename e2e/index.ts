import * as cloud from '../src/kubernetes';

const provider = new cloud.Provider('cluster', {
  fromEnv: 'KUBECONFIG',
  namespace: 'default',
});

export const ingress = new cloud.services.NginxIngress('ingress', {
  provider: provider,
});

export const certs = new cloud.services.CertManager('cert-manager', {
  provider: provider,
});

export const monitoring = new cloud.services.GrafanaStack('monitoring', {
  provider: provider,
});

export const app = new cloud.App('my-app', {
  provider: provider,
  imageName: '',
  src: './app',
  httpPort: 8000,
  ingress: {
    host: 'www.example.com',
  },
});
