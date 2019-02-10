import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { Cluster } from '../cluster';
import { codeBlock } from 'common-tags';

export interface LokiOptions {
  provider?: k8s.Provider;
  namespace?: k8s.core.v1.Namespace;
}

export class Loki extends pulumi.ComponentResource {

  configMap: k8s.core.v1.ConfigMap;
  deployment: k8s.apps.v1.Deployment;
  service: k8s.core.v1.Service;

  constructor(private name: string, options: LokiOptions = {}) {
    super('james:monitoring:loki', name);

    const provider = {
      provider: options.provider,
      parent: this,
    }

    const metadata = {
      namespace: options.namespace ? options.namespace.metadata.apply(value => value.name) : 'default',
      name: this.name,
      labels: {
        name: this.name,
      },
    }

    this.configMap = new k8s.core.v1.ConfigMap('loki-config', {
      metadata: metadata,
      data: {
        'loki.yaml': codeBlock`
          auth_enabled: false
          server:
            http_listen_port: 3100
          ingester:
            lifecycler:
              ring:
                store: inmemory
                replication_factor: 1
          schema_config:
            configs:
            - from: 0
              store: boltdb
              object_store: filesystem
              schema: v9
              index:
                prefix: index_
                period: 168h
          storage_configs:
            - name: boltdb
              directory: /tmp/loki/index
            - name: filesystem
              directory: /tmp/loki/chunks
        `,
      }
    }, provider);

    this.deployment = new k8s.apps.v1.Deployment('loki-deployment', {
      metadata: metadata,
      spec: {
        replicas: 1,
        selector: {
          matchLabels: metadata.labels,
        },
        template: {
          metadata: metadata,
          spec: {
            containers: [
              {
                image: 'grafana/loki:master',
                name: 'loki',
                ports: [{ containerPort: 3100 }],
                volumeMounts: [
                  {
                    name: 'loki-config',
                    mountPath: '/etc/loki',
                  }
                ]
              }
            ],
            volumes: [
              {
                name: 'loki-config',
                configMap: {
                  name: this.configMap.metadata.apply(value => value.name),
                }
              }
            ]
          }
        }
      }
    }, provider);

    this.service = new k8s.core.v1.Service('loki-service', {
      metadata: metadata,
      spec: {
        type: 'ClusterIP',
        selector: metadata.labels,
        ports: [{ port: 3100, targetPort: 3100 }],
      }
    }, provider);
  }
}
