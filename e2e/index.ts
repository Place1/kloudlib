import * as cloud from '../src/kubernetes';

const provider = new cloud.Provider('cluster', {
  // you can create the provider using an environment
  // variable or file
  // by default pulumi will use whatever your CLI kubectl
  // uses (generally the content of ~/.kube/config)
  // fromEnv: 'KUBECONFIG',
  // fromFile: './kubeconfig',
  namespace: 'default',
});

export const ingress = new cloud.services.NginxIngress('ingress', {
  provider: provider,
});

// export const certs = new cloud.services.CertManager('cert-manager', {
//   provider: provider,
// });

// export const monitoring = new cloud.services.GrafanaStack('monitoring', {
//   provider: provider,
// });

// export const app = new cloud.App('my-app', {
//   provider: provider,
//   imageName: 'example.com/my-app',
//   src: './app',
//   httpPort: 8000,
//   ingress: {
//     host: 'www.example.com',
//   },
// });
