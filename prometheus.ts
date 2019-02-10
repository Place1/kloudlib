import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { Cluster } from './cluster';
import { codeBlock } from 'common-tags';

export interface PrometheusOptions {
  cluster: Cluster;
}

export class Prometheus extends pulumi.CustomResource {
  constructor(private name: string, private options: PrometheusOptions) {
    super('prometheus', name);

    const provider = { provider: options.cluster.getKubernetesProvider() };

    const config = this.createConfig();

    const serviceAccount = this.createServiceAccount();

    const deployment = this.createDeployment(config, serviceAccount);

    const service = this.createService(deployment);
  }

  private getMetadata() {
    const namespace = new k8s.core.v1.Namespace('monitoring', {
      metadata: {
        name: 'monitoring',
      }
    }, this.getK8sProvider());

    return {
      namespace: namespace.metadata.apply(value => value.name),
      name: this.name,
      labels: {
        name: this.name,
      },
    };
  }

  private getK8sProvider() {
    return { provider: this.options.cluster.getKubernetesProvider() };
  }

  private createConfig() {
    return new k8s.core.v1.ConfigMap('prometheus-config', {
      metadata: this.getMetadata(),
      data: {
        'prometheus.yaml': codeBlock`
          scrape_configs:
          - job_name: 'kubernetes-apiservers'
            kubernetes_sd_configs:
            - role: endpoints
            scheme: https
            tls_config:
              ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
            bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
            relabel_configs:
            - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
              action: keep
              regex: default;kubernetes;https
          - job_name: 'kubernetes-nodes'
            scheme: https
            tls_config:
              ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
            bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
            kubernetes_sd_configs:
            - role: node
            relabel_configs:
            - action: labelmap
              regex: __meta_kubernetes_node_label_(.+)
            - target_label: __address__
              replacement: kubernetes.default.svc:443
            - source_labels: [__meta_kubernetes_node_name]
              regex: (.+)
              target_label: __metrics_path__
              replacement: /api/v1/nodes/$1/proxy/metrics
          - job_name: 'kubernetes-cadvisor'
            scheme: https
            tls_config:
              ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
            bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
            kubernetes_sd_configs:
            - role: node
            relabel_configs:
            - action: labelmap
              regex: __meta_kubernetes_node_label_(.+)
            - target_label: __address__
              replacement: kubernetes.default.svc:443
            - source_labels: [__meta_kubernetes_node_name]
              regex: (.+)
              target_label: __metrics_path__
              replacement: /api/v1/nodes/$1/proxy/metrics/cadvisor
          - job_name: 'kubernetes-service-endpoints'
            kubernetes_sd_configs:
            - role: endpoints
            relabel_configs:
            - source_labels: [__meta_kubernetes_service_annotation_example_io_should_be_scraped]
              action: keep
              regex: true
            - action: labelmap
              regex: __meta_kubernetes_service_label_(.+)
            - source_labels: [__meta_kubernetes_namespace]
              action: replace
              target_label: kubernetes_namespace
            - source_labels: [__meta_kubernetes_service_name]
              action: replace
              target_label: kubernetes_name
          - job_name: 'kubernetes-pods'
            kubernetes_sd_configs:
            - role: pod
            relabel_configs:
            - action: labelmap
              regex: __meta_kubernetes_pod_label_(.+)
            - source_labels: [__meta_kubernetes_namespace]
              action: replace
              target_label: kubernetes_namespace
            - source_labels: [__meta_kubernetes_pod_name]
              action: replace
              target_label: kubernetes_pod_name
        `,
      }
    }, this.getK8sProvider());
  }

  private createServiceAccount() {
    const clusterRole = new k8s.rbac.v1.ClusterRole('prometheus-cluster-role', {
      metadata: this.getMetadata(),
      rules: [
        {
          apiGroups: [""],
          resources: [
            'nodes',
            'nodes/proxy',
            'services',
            'endpoints',
            'pods',
          ],
          verbs: ['get', 'list', 'watch'],
        },
        {
          apiGroups: ['extensions'],
          resources: ['ingress'],
          verbs: ['get', 'list', 'watch'],
        }
      ]
    }, this.getK8sProvider());

    const serviceAccount = new k8s.core.v1.ServiceAccount('prometheus-service-account', {
      metadata: this.getMetadata(),
    }, this.getK8sProvider());

    const clusterRoleBinding = new k8s.rbac.v1.ClusterRoleBinding('prometheus-cluster-role-binding', {
      metadata: this.getMetadata(),
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: clusterRole.metadata.apply(value => value.name),
      },
      subjects: [
        {
          kind: 'ServiceAccount',
          name: serviceAccount.metadata.apply(value => value.name),
          namespace: serviceAccount.metadata.apply(value => value.namespace),
        }
      ]
    }, this.getK8sProvider());

    return serviceAccount;
  }

  private createDeployment(config: k8s.core.v1.ConfigMap, serviceAccount: k8s.core.v1.ServiceAccount) {
    const pvc = new k8s.core.v1.PersistentVolumeClaim('prometheus-storage', {
      metadata: this.getMetadata(),
      spec: {
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: '5Gi'
          }
        }
      }
    }, this.getK8sProvider());

    return new k8s.apps.v1.Deployment('prometheus', {
      metadata: this.getMetadata(),
      spec: {
        replicas: 1,
        selector: {
          matchLabels: this.getMetadata().labels,
        },
        template: {
          metadata: this.getMetadata(),
          spec: {
            serviceAccount: serviceAccount.metadata.apply(value => value.name),
            containers: [
              {
                image: 'prom/prometheus:v2.4.3',
                name: 'prometheus',
                ports: [{ containerPort: 9090 }],
                args: [
                  '--config.file=/etc/prometheus/prometheus.yml',
                  '--storage.tsdb.path=/prometheus',
                  '--storage.tsdb.retention=48h',
                ],
                volumeMounts: [
                  {
                    name: 'prometheus-storage',
                    mountPath: '/prometheus',
                  },
                  {
                    name: 'prometheus-config',
                    mountPath: '/etc/prometheus',
                  }
                ]
              }
            ],
            volumes: [
              {
                name: 'prometheus-data',
                persistentVolumeClaim: {
                  claimName: pvc.metadata.apply(value => value.name),
                }
              },
              {
                name: 'prometheus-config',
                configMap: {
                  name: config.metadata.apply(value => value.name),
                }
              }
            ],
            securityContext: {
              fsGroup: 2000
            },
          },
        }
      }
    }, this.getK8sProvider());
  }

  private createService(deployment: k8s.apps.v1.Deployment) {
    return new k8s.core.v1.Service('prometheus-service', {
      metadata: this.getMetadata(),
      spec: {
        type: 'ClusterIP',
        selector: deployment.spec.apply(value => value.selector.matchLabels),
        ports: [
          {
            targetPort: 9090,
            port: 9090,
          }
        ]
      }
    }, this.getK8sProvider());
  }
}
