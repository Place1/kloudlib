# kloudlib

This pulumi library packages commonly used services for kubernetes.

## Documentation

[https://place1.github.io/kloudlib/](https://place1.github.io/kloudlib/)

## Installation

```bash
npm install --save kloudlib
```

## Examples

So you've got a new cluster and now you want to setup some core services on
it for ingress or monitoring.

Here's how we can setup Nginx Ingress and the Grafana Stack using kloudlib:

```typescript
import * as kloudlib from 'kloudlib';

new kloudlib.NginxIngress('nginx-ingress');

new kloudlib.CertManager('cert-manager', {
  useStagingACME: true,
  acme: {
    email: 'me@example.com',
  },
});

new kloudlib.GrafanaStack('grafana-stack');
```

Or maybe you've got a few applications to deploy from your private registry
and you want to avoid writing and maintaining the generic deployment/service/ingress
boilerplate:

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as kloudlib from 'kloudlib';

const config = new pulumi.Config();

const imagePullSecret = new kloudlib.ImagePullSecret('image-pull-secret', {
  server: config.require('docker.server'),
  username: config.require('docker.username'),
  password: config.requireSecret('docker.password'),
});

export const app = new kloudlib.App('app', {
  src: path.resolve(__dirname), // path to your Dockerfile
  imageName: 'your.docker.registry/project/image',
  httpPort: 80, // what port does your app listen on? defaults to 80.
  replicas: 2,
  ingress: {
    hosts: [
      'example.com',
      'www.example.com',
    ],
  },
  imagePullSecret: imagePullSecret.secret.metadata.name,
});
```
