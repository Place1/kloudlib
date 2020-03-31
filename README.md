# kloudlib

Kloudlib is a collection of NPM libraries for deploying commonly used
open source software to Kubernetes using Pulumi.

## Documentation

[https://place1.github.io/kloudlib/](https://place1.github.io/kloudlib/)

## Installation

Kloudlib distributes each service as a seperate package.

```bash
npm install --save @kloudlib/<package>
```

Distributing each service as a seperate NPM package means you only need to
install what you use and each package is versioned separately.

## What does it look like?

So you've got a new cluster and now you want to deploy nginx-ingress with
cert-manager for automatic TLS.

Here's how we can setup Nginx Ingress and Cert Manager with Kloudlib:

```typescript
import { NginxIngress } from '@kloudlib/nginx-ingress';
import { CertManager } from '@kloudlib/cert-manager';

new NginxIngress('nginx-ingress', {
  mode: {
    kind: 'Deployment',
    loadBalancerIP: 'x.x.x.x',
    replicas: 2,
  },
});

new CertManager('cert-manager', {
  useStagingACME: true,
  acme: {
    email: 'me@example.com',
  },
});
```

Now you might like some monitoring for this cluster so let's deploy Prometheus/Loki/Grafana
for an all-in-one logs and metrics solution:

```typescript
import * as k8s from '@pulumi/kubernetes';
import { GrafanaStack } from '@kloudlib/grafana-stack';

// Let's deploy grafana-stack into it's own namespace.
const ns = new k8s.core.Namespace('monitoring', {
  metadata: {
    name: 'monitoring',
  },
});

// GrafanaStack includes prometheus and loki and automaticall
// configures them together.
new GrafanaStack('grafana-stack', {
  namespace: ns.metadata.name,
  grafana: {
    ingress: {
      hosts: ['grafana.example.com'],
    },
  },
});
```

## Contributing A New Package

Contributions are very much welcome. Kloudlib is intended to be a
library for the community by the community.

Here's how you can get started:

1. Clone the repository
2. Install the dependencies in the root folder: `npm install`
3. Bootstrap the repo: `npm run bootstrap`
4. Generate your new package using: `./create-package.sh <your-package-name>`
    * for example: `./create-package.sh nginx-ingress`
5. Implement your Pulumi!

When you're done, you can run `npm run build` from your package's folder
or from the root folder (to build everything).

To test out your new package before submitting a PR you can use `npm link`
to install it in a local Pulumi project.
