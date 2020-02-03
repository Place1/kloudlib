import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as kloudlib from '../src';

const config = new pulumi.Config();

const sharedns = new k8s.core.v1.Namespace(`${name}-shared`, {
  metadata: {
    name: 'shared',
  }
});

const shared = new kloudlib.Provider('provider', {
  fromEnv: 'KUBECONFIG',
  namespace: sharedns.metadata.name,
});

export const ingress = new kloudlib.NginxIngress('ingress', {
  namespace: sharedns.metadata.name,
  provider: shared,
  mode: {
    kind: 'DaemonSet',
  },
});

export const certs = new kloudlib.CertManager('cert-manager', {
  provider: shared,
  namespace: sharedns.metadata.name,
  useStagingACME: true,
});

// export const oauthProxy = new kloudlib.OAuthProxy('oauth-proxy', {
//   provider?: shared,
//   ingress: {
//     host: pulumi.interpolate`auth.${config.require('domain')}`,
//   },
//   mode: {
//     kind: 'GitLab',
//     gitlabHost: config.require('gitlab.host'),
//     clientId: config.requireSecret('gitlab.clientId'),
//     clientSecret: config.requireSecret('gitlab.clientSecret'),
//   },
// });

export const monitoring = new kloudlib.GrafanaStack('monitoring', {
  provider: shared,
  namespace: sharedns.metadata.name,
  grafana: {
    persistence: {
      enabled: false,
    }
  },
  loki: {
    persistence: {
      enabled: false,
    }
  },
  prometheus: {
    persistence: {
      enabled: false,
    },
  },
});

// const defaultns = new kloudlib.Provider('app-provider', {
//   fromEnv: 'KUBECONFIG',
//   namespace: 'default',
// });

// export const app = new kloudlib.App('my-app', {
//   provider: defaultns,
//   namespace: 'default',
//   imageName: config.require('imageName'),
//   src: './app',
//   httpPort: 8000,
//   ingress: {
//     host: pulumi.interpolate`www.${config.require('domain')}`,
//   },
// });
