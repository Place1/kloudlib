import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { Cluster } from '../cluster';
import { codeBlock } from 'common-tags';
import { Loki } from './loki';
import { meta } from '@pulumi/kubernetes';

export interface PromtailOptions {
  loki: Loki;
  provider?: k8s.Provider;
  namespace?: k8s.core.v1.Namespace;
}

export class Promtail extends pulumi.ComponentResource {

  serviceAccount: k8s.core.v1.ServiceAccount;
  clusterRole: k8s.rbac.v1.ClusterRole;
  clusterRoleBinding: k8s.rbac.v1.ClusterRoleBinding;
  configMap: k8s.core.v1.ConfigMap;
  daemonset: k8s.apps.v1.DaemonSet;

  constructor(private name: string, private options: PromtailOptions) {
    super('james:monitoring:promtail', name);

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

    this.serviceAccount = new k8s.core.v1.ServiceAccount('promtail-service-account', {
      metadata: metadata,
    }, provider);

    this.clusterRole = new k8s.rbac.v1.ClusterRole('promtail-cluster-role', {
      metadata: metadata,
      rules: [
        {
          apiGroups: [''],
          resources: ['nodes', 'nodes/proxy', 'services', 'endpoints', 'pods'],
          verbs: ['get', 'watch', 'list'],
        }
      ]
    }, provider);

    this.clusterRoleBinding = new k8s.rbac.v1.ClusterRoleBinding('promtail-cluster-role-binding', {
      metadata: metadata,
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: this.clusterRole.metadata.apply(value => value.name),
      },
      subjects: [
        {
          kind: 'ServiceAccount',
          name: this.serviceAccount.metadata.apply(value => value.name),
          namespace: this.serviceAccount.metadata.apply(value => value.namespace),
        }
      ]
    }, provider);

    this.configMap = new k8s.core.v1.ConfigMap('promtail-config', {
      metadata: metadata,
      data: {
        'promtail.yaml': codeBlock`
          scrape_configs:
            - job_name: kubernetes-pods
              kubernetes_sd_configs:
              - role: pod
              relabel_configs:
              - source_labels:
                - __meta_kubernetes_pod_node_name
                target_label: __host__
              - action: drop
                regex: ^$
                source_labels:
                - __meta_kubernetes_pod_label_name
              - action: replace
                replacement: $1
                separator: /
                source_labels:
                - __meta_kubernetes_namespace
                - __meta_kubernetes_pod_label_name
                target_label: job
              - action: replace
                source_labels:
                - __meta_kubernetes_namespace
                target_label: namespace
              - action: replace
                source_labels:
                - __meta_kubernetes_pod_name
                target_label: instance
              - action: replace
                source_labels:
                - __meta_kubernetes_pod_container_name
                target_label: container_name
              - action: labelmap
                regex: __meta_kubernetes_pod_label_(.+)
              - replacement: /var/log/pods/$1/*.log
                separator: /
                source_labels:
                - __meta_kubernetes_pod_uid
                - __meta_kubernetes_pod_container_name
                target_label: __path__
            - job_name: kubernetes-pods-app
              kubernetes_sd_configs:
              - role: pod
              relabel_configs:
              - source_labels:
                - __meta_kubernetes_pod_node_name
                target_label: __host__
              - action: drop
                regex: ^$
                source_labels:
                - __meta_kubernetes_pod_label_app
              - action: replace
                replacement: $1
                separator: /
                source_labels:
                - __meta_kubernetes_namespace
                - __meta_kubernetes_pod_label_app
                target_label: job
              - action: replace
                source_labels:
                - __meta_kubernetes_namespace
                target_label: namespace
              - action: replace
                source_labels:
                - __meta_kubernetes_pod_name
                target_label: instance
              - action: replace
                source_labels:
                - __meta_kubernetes_pod_container_name
                target_label: container_name
              - action: labelmap
                regex: __meta_kubernetes_pod_label_(.+)
              - replacement: /var/log/pods/$1/*.log
                separator: /
                source_labels:
                - __meta_kubernetes_pod_uid
                - __meta_kubernetes_pod_container_name
                target_label: __path__
        `,
      }
    }, provider);

    const podSecurityPolicy = new k8s.extensions.v1beta1.PodSecurityPolicy('promtail-pod-security-policy', {
      metadata: metadata,
      spec: {
        privileged: true,
        allowPrivilegeEscalation: true,
        volumes: [
          "secret",
          "configMap",
          'hostPath'
        ],
        hostNetwork: false,
        hostIPC: false,
        hostPID: false,
        runAsUser: {
          rule: "RunAsAny"
        },
        seLinux: {
          rule: "RunAsAny"
        },
        supplementalGroups: {
          rule: "RunAsAny"
        },
        fsGroup: {
          rule: "RunAsAny",
          readOnlyRootFilesystem: false
        }
      },
    }, provider);

    const role = new k8s.rbac.v1.Role('promtail-role', {
      metadata: metadata,
      "rules": [
        {
          "apiGroups": [
            "extensions"
          ],
          "resources": [
            "podsecuritypolicies"
          ],
          "verbs": [
            "use"
          ],
          "resourceNames": [metadata.name]
        }
      ]
    }, provider)

    const roleBinding = new k8s.rbac.v1.RoleBinding('promtail-role-binding', {
      metadata: metadata,
      "roleRef": {
        "apiGroup": "rbac.authorization.k8s.io",
        "kind": "Role",
        "name": role.metadata.apply(value => value.name),
      },
      "subjects": [
        {
          "kind": "ServiceAccount",
          "name": this.serviceAccount.metadata.apply(value => value.name),
        }
      ],
    }, provider);

    this.daemonset = new k8s.apps.v1.DaemonSet('promtail-daemonset', {
      metadata: metadata,
      spec: {
        selector: {
          matchLabels: metadata.labels,
        },
        template: {
          metadata: metadata,
          spec: {
            serviceAccount: this.serviceAccount.metadata.apply(value => value.name),
            containers: [
              {
                name: 'promtail',
                image: 'grafana/promtail:master-ffe1093',
                args: pulumi
                  .all([options.loki.service.metadata, options.loki.service.spec])
                  .apply(([metadata, spec]) => [
                    '-config.file=/etc/promtail/promtail.yaml',
                    `-client.url=http://${metadata.name}:${spec.ports[0].port}/api/prom/push`,
                  ]),
                ports: [{ containerPort: 3100 }],
                env: [
                  {
                    name: 'HOSTNAME',
                    valueFrom: {
                      fieldRef: {
                        fieldPath: 'spec.nodeName',
                      }
                    }
                  }
                ],
                volumeMounts: [
                  {
                    name: 'promtail-config',
                    mountPath: '/etc/promtail',
                  },
                  {
                    name: 'varlog',
                    mountPath: '/var/log',
                  },
                  {
                    name: 'varlibdockercontainers',
                    mountPath: '/var/lib/docker/containers',
                  }
                ],
                securityContext: {
                  privileged: true,
                  runAsUser: 0,
                }
              }
            ],
            volumes: [
              {
                name: 'promtail-config',
                configMap: {
                  name: this.configMap.metadata.apply(value => value.name),
                }
              },
              {
                name: 'varlog',
                hostPath: {
                  path: '/var/log'
                }
              },
              {
                name: 'varlibdockercontainers',
                hostPath: {
                  path: '/var/lib/docker/containers'
                }
              },
            ]
          }
        }
      }
    }, provider);
  }
}
