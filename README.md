# kloudlib

This pulumi library packages commonly used services for kubernetes.

## Documentation

[https://place1.github.io/kloudlib/](https://place1.github.io/kloudlib/)

## Services

```typescript
import * as kloudlib from 'kloudlib';

kloudlib.NginxIngress
kloudlib.CertManager
kloudlib.OAuthProxy
kloudlib.GrafanaStack
kloudlib.Grafana
kloudlib.Loki
kloudlib.Prometheus
```

## Archetypes

```typescript
import * as kloudlib from 'kloudlib';

kloudlib.App
```

## Examples

So you've got a new cluster and now you want to setup some core services on
it for ingress or monitoring.

Here's how we can setup Nginx Ingress and the Grafana Stack using kloudlib:

```typescript
import * as kloudlib from 'kloudlib';

new kloudlib.NginxIngress('nginx-ingress', {
});

new kloudlib.CertManager('cert-manager', {
  useStagingACME: true,
  acme: {
    email: 'me@example.com',
  },
});

new kloudlib.GrafanaStack('grafana', {
  namespace: corens.metadata.name,
});
```
