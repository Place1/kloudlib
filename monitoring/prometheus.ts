import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { Cluster } from '../archetypes/cluster';
import { codeBlock } from 'common-tags';

export interface PrometheusOptions {
  provider?: k8s.Provider;
  namespace?: k8s.core.v1.Namespace;
}

export class Prometheus extends pulumi.ComponentResource {

  config: k8s.core.v1.ConfigMap;
  clusterRole: k8s.rbac.v1.ClusterRole;
  serviceAccount: k8s.core.v1.ServiceAccount;
  clusterRoleBinding: k8s.rbac.v1.ClusterRoleBinding;
  pvc: k8s.core.v1.PersistentVolumeClaim;
  deployment: k8s.apps.v1.Deployment;
  service: k8s.core.v1.Service;

  constructor(private name: string, private options: PrometheusOptions = {}, opts?: pulumi.ComponentResourceOptions) {
    super('Prometheus', name);

    const provider = {
      provider: options.provider,
      parent: this,
    };

    const metadata = {
      namespace: options.namespace ? options.namespace.metadata.name : undefined,
      name: this.name,
      labels: {
        name: this.name,
      },
    };

    this.config = new k8s.core.v1.ConfigMap('prometheus-config', {
      metadata: metadata,
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
    }, provider);

    this.clusterRole = new k8s.rbac.v1.ClusterRole('prometheus-cluster-role', {
      metadata: metadata,
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
    }, provider);

    this.serviceAccount = new k8s.core.v1.ServiceAccount('prometheus-service-account', {
      metadata: metadata,
    }, provider);

    this.clusterRoleBinding = new k8s.rbac.v1.ClusterRoleBinding('prometheus-cluster-role-binding', {
      metadata: metadata,
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: this.clusterRole.metadata.name,
      },
      subjects: [
        {
          kind: 'ServiceAccount',
          name: this.serviceAccount.metadata.name,
          namespace: this.serviceAccount.metadata.namespace,
        }
      ]
    }, provider);

    this.pvc = new k8s.core.v1.PersistentVolumeClaim('prometheus-storage', {
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

    this.deployment = new k8s.apps.v1.Deployment('prometheus', {
      metadata: metadata,
      spec: {
        replicas: 1,
        selector: {
          matchLabels: metadata.labels,
        },
        template: {
          metadata: metadata,
          spec: {
            serviceAccount: this.serviceAccount.metadata.name,
            containers: [
              {
                image: 'prom/prometheus:v2.4.3',
                name: 'prometheus',
                ports: [{ containerPort: 9090 }],
                args: [
                  '--config.file=/etc/prometheus/prometheus.yaml',
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
                name: 'prometheus-storage',
                persistentVolumeClaim: {
                  claimName: this.pvc.metadata.name,
                }
              },
              {
                name: 'prometheus-config',
                configMap: {
                  name: this.config.metadata.name,
                }
              }
            ],
            securityContext: {
              fsGroup: 2000
            },
          },
        }
      }
    }, provider);

    this.service = new k8s.core.v1.Service('prometheus-service', {
      metadata: metadata,
      spec: {
        type: 'ClusterIP',
        selector: this.deployment.spec.selector.matchLabels,
        ports: [
          {
            targetPort: 9090,
            port: 9090,
          }
        ]
      }
    }, provider);
  }
}
