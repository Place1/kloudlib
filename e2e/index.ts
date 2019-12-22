import * as cloud from '../src/kubernetes';

const provider = cloud.KUBECONFIG();

export const core = new cloud.Core('core', { provider });

export const app = new cloud.App('my-app', {
  provider: provider,
  imageName: '',
  src: './app',
  httpPort: 8000,
  replicas: 3,
  ingress: {
    host: 'my-app.example.com',
  },
  env: {
    EXAMPLE_KEY: 'value',
  },
  secrets: {
    EXAMPLE_KEY: 'some-secret-value',
  },
  resources: {
    requests: {
      cpu: '300m',
      memory: '512Mi',
    },
    limits: {
      cpu: '2',
      memory: '1Gi',
    },
  },
});
