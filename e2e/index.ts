import * as cloud from '../src/kubernetes';
import * as random from '@pulumi/random';

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

export const oauthProxy = new cloud.services.OAuthProxy('oauth-proxy', {
  provider: provider,
  ingress: {
    host: 'auth.example.com',
  },
  mode: {
    // supports: Google, Azure, GitHub, GitLab;
    kind: 'GitHub',
    clientId: '<client-id>',
    clientSecret: '<client-secret>',
    githubOrg: '<limit-to-this-org>',
    githubTeam: '<limit-to-this-team>',
  },
  staticCredentials: [{
    username: 'hello',
    password: 'world', // insecure, consider using a pulumi secret or RandomString
  }],
});

// export const certs = new cloud.services.CertManager('cert-manager', {
//   provider: provider,
// });

export const monitoring = new cloud.services.GrafanaStack('grafana', {
  provider: provider,
  grafana: {
    ingress: {
      host: 'grafana.example.com',
      annotations: oauthProxy.nginxAnnotations(),
    },
  },
});

// export const app = new cloud.App('my-app', {
//   provider: provider,
//   imageName: 'example.com/my-app',
//   src: './app',
//   httpPort: 8000,
//   ingress: {
//     host: 'www.example.com',
//   },
// });
