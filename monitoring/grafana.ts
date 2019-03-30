import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as fs from 'fs';
import * as path from 'path';
import { meta } from '@pulumi/kubernetes';
import { codeBlock } from 'common-tags';
import { Loki } from './loki';
import { Prometheus } from './prometheus';

export interface GrafanaOptions {
  provider?: k8s.Provider;
  namespace?: k8s.core.v1.Namespace;
  loki?: Loki;
  prometheus?: Prometheus;
}

export class Grafana extends pulumi.ComponentResource {

  pvc: k8s.core.v1.PersistentVolumeClaim;
  configMap: k8s.core.v1.ConfigMap;
  deployment: k8s.apps.v1.Deployment;
  service: k8s.core.v1.Service;

  constructor(name: string, options: GrafanaOptions = {}, opts?: pulumi.ComponentResourceOptions) {
    super('Grafana', name);

    const provider = {
      provider: options.provider,
      parent: this,
    }

    const metadata = {
      namespace: options.namespace ? options.namespace.metadata.name : undefined,
      name: name,
      labels: {
        name: name,
      },
    }

    this.pvc = new k8s.core.v1.PersistentVolumeClaim('grafana-storage', {
      metadata: metadata,
      spec: {
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: '5Gi'
          }
        }
      }
    }, provider);

    this.configMap = new k8s.core.v1.ConfigMap('grafana-config', {
      metadata: metadata,
      data: {
        'grafana.ini': codeBlock`
          [auth.anonymous]
          enabled = true
          org_name = Main Org.
          org_role = Editor
          [auth.basic]
          enabled = false
        `,
        'dashboard-provider.yaml': codeBlock`
          apiVersion: 1
          providers:
            - name: 'default'
              folder: ''
              type: file
              disableDeletion: false
              updateIntervalSeconds: 10 # how often Grafana will scan for changed dashboards
              options:
                path: /var/lib/grafana/dashboards
        `,
        'datasource-provider.yaml': pulumi
          .all([
            options.prometheus!.service.metadata,
            options.prometheus!.service.spec,
            options.loki!.service.metadata,
            options.loki!.service.spec])
          .apply(([ promMeta, promSpec, lokiMeta, lokiSpec ]) => codeBlock`
            apiVersion: 1
            datasources:
              - name: prometheus
                type: prometheus
                access: proxy
                url: http://${promMeta.name}:${promSpec.ports[0].port}
                basicAuth: false
                editable: false
              - name: loki
                type: loki
                access: proxy
                url: http://${lokiMeta.name}:${lokiSpec.ports[0].port}
                basicAuth: false
                editable: false
          `),
        'kubernetes-monitoring.json': fs.readFileSync(path.join(__dirname, 'kubernetes-dashboard.json')).toString(),
      }
    }, provider);

    this.deployment = new k8s.apps.v1.Deployment('grafana-deployment', {
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
                name: 'grafana',
                image: 'grafana/grafana:6.0.0-beta1',
                ports: [{ containerPort: 3000 }],
                securityContext: {
                  runAsUser: 472,
                  fsGroup: 472,
                },
                volumeMounts: [
                  {
                    name: 'grafana-storage',
                    mountPath: '/var/lib/grafana',
                  },
                  {
                    name: 'grafana-config',
                    mountPath: '/etc/grafana',
                  },
                  {
                    name: 'grafana-dashboards',
                    mountPath: '/var/lib/grafana/dashboards',
                  }
                ]
              }
            ],
            volumes: [
              {
                name: 'grafana-storage',
                persistentVolumeClaim: {
                  claimName: this.pvc.metadata.name,
                }
              },
              {
                name: 'grafana-config',
                configMap: {
                  name: this.configMap.metadata.name,
                  items: [
                    {
                      key: 'grafana.ini',
                      path: 'grafana.ini',
                    },
                    {
                      key: 'dashboard-provider.yaml',
                      path: 'provisioning/dashboards/dashboard-provider.yaml',
                    },
                    {
                      key: 'datasource-provider.yaml',
                      path: 'provisioning/datasources/datasource-provider.yaml',
                    },
                  ]
                }
              },
              {
                name: 'grafana-dashboards',
                configMap: {
                  name: this.configMap.metadata.name,
                  items: [
                    {
                      key: 'kubernetes-monitoring.json',
                      path: 'kubernetes-monitoring.json',
                    },
                  ]
                }
              },
            ]
          }
        }
      }
    }, provider);

    this.service = new k8s.core.v1.Service('grafana-service', {
      metadata: metadata,
      spec: {
        type: 'ClusterIP',
        selector: metadata.labels,
        ports: [
          {
            port: this.deployment.spec.template.spec.containers[0].ports[0].containerPort,
            targetPort: this.deployment.spec.template.spec.containers[0].ports[0].containerPort,
          }
        ]
      }
    }, provider);
  }
}
