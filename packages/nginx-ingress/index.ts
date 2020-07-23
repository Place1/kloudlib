/**
 * @module "@kloudlib/nginx-ingress"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { NginxIngress } from '@kloudlib/nginx-ingress';
 *
 * new NginxIngress('nginx-ingress', {
 *   // ...
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as abstractions from '@kloudlib/abstractions';
import { merge } from 'lodash';

export interface NginxIngressInputs {
  provider?: k8s.Provider;
  namespace?: pulumi.Input<string>;
  /**
   * the helm chart version
   */
  version?: string;
  /**
   * mode configures nginx as either a kubernetes
   * deployment or daemonset.
   *
   * In Deployment mode a kubernetes Deployment will be
   * created behind a kubernetes Service of type LoadBalancer.
   * The Deployment mode is intended to be used in Cloud Environments.
   *
   * In DaemonSet mode a kubernetes DaemonSet will be created
   * without a kubernetes Service, instead, hostPorts will be
   * used by the DaemonSet containers. The DaemonSet mode is intended
   * to be used in onpremise environments where a LoadBalancer services
   * may not available.
   *
   * defaults to Deployment mode.
   */
  mode?: NginxIngressDeploymentMode | NginxIngressDaemonSetMode;
  /**
   * config sets nginx config map entries.
   *
   * see: https://github.com/kubernetes/ingress-nginx/blob/master/docs/user-guide/nginx-configuration/configmap.md
   */
  config?: Record<string, string>;
  /**
   * configure any L4 TCP services
   */
  tcpServices?: Record<number, L4ServiceBackend>;
  /**
   * configure any L4 UDP services
   */
  udpServices?: Record<number, L4ServiceBackend>;
}

export interface NginxIngressDeploymentMode {
  kind: 'Deployment';
  /**
   * how many nginx ingress controller
   * replicas should be deployed.
   *
   * defaults to 1
   */
  replicas?: pulumi.Input<number>;
  /**
   * loadBalancerIP configures the cloud loadbalancer
   * IP address on supported clouds.
   * This IP will need to be provisioned using the
   * appropriate cloud resource.
   *
   * If this in left blank then kubernetes will assign
   * an IP address to the nginx-ingress LoadBalancer Service
   * for you (if supported by your cloud provider).
   */
  loadBalancerIP?: pulumi.Input<string>;
  /**
   * serviceAnnotations adds the given annotations to the
   * nginx-ingress loadbalancer service
   */
  serviceAnnotations?: pulumi.Input<Record<string, pulumi.Input<string>>>;
}

export interface NginxIngressDaemonSetMode {
  kind: 'DaemonSet';
}

export interface L4ServiceBackend {
  namespace: pulumi.Input<string>;
  serviceName: pulumi.Input<string>;
  servicePort: pulumi.Input<number>;
}

type NginxL4Backends = Record<number, pulumi.Input<string>>;

export interface NginxIngressOutputs {
  meta: pulumi.Output<abstractions.HelmMeta>;
  /**
   * the 'kubernetes.io/ingress.class' annotation that this
   * ingress controller will consume
   */
  ingressClass: pulumi.Output<string>;
}

/**
 * @noInheritDoc
 */
export class NginxIngress extends pulumi.ComponentResource implements NginxIngressOutputs {
  readonly meta: pulumi.Output<abstractions.HelmMeta>;
  readonly ingressClass: pulumi.Output<string>;

  constructor(name: string, props?: NginxIngressInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:NginxIngress', name, props, opts);

    this.ingressClass = pulumi.output('nginx');

    this.meta = pulumi.output<abstractions.HelmMeta>({
      chart: 'nginx-ingress',
      version: props?.version ?? '1.29.2',
      repo: 'https://kubernetes-charts.storage.googleapis.com',
    });

    new k8s.helm.v3.Chart(
      name,
      {
        namespace: props?.namespace,
        chart: this.meta.chart,
        version: this.meta.version,
        fetchOpts: {
          repo: this.meta.repo,
        },
        values: {
          rbac: {
            create: true,
          },
          defaultBackend: {
            enabled: false,
          },
          controller: merge({}, this.controllerValues(props), {
            config: props?.config,
            metrics: {
              enabled: true,
              service: {
                type: 'ClusterIP',
                servicePort: 10254,
                annotations: {
                  'prometheus.io/scrape': 'true',
                  'prometheus.io/port': '10254',
                },
              },
            },
          }),
          tcp: this.l4Services(props?.tcpServices ?? {}),
          udp: this.l4Services(props?.udpServices ?? {}),
        },
      },
      {
        parent: this,
        providers: props?.provider
          ? {
              kubernetes: props?.provider,
            }
          : {},
      }
    );
  }

  private controllerValues(props?: NginxIngressInputs) {
    switch (props?.mode?.kind) {
      case 'DaemonSet':
        return this.daemonSetValues(props?.mode);
      case 'Deployment':
        return this.deploymentValues(props?.mode);
      default:
        return this.deploymentValues({
          kind: 'Deployment',
          replicas: 1,
        });
    }
  }

  private daemonSetValues(props: NginxIngressDaemonSetMode) {
    return {
      kind: 'DaemonSet',
      reportNodeInternalIp: true,
      service: {
        enabled: false,
      },
      daemonset: {
        useHostPort: true,
      },
    };
  }

  private deploymentValues(props: NginxIngressDeploymentMode) {
    const replicas = props?.replicas ?? 1;
    return {
      kind: 'Deployment',
      replicaCount: replicas,
      service: {
        type: 'LoadBalancer',
        loadBalancerIP: props?.loadBalancerIP,
        externalTrafficPolicy: 'Local',
        annotations: props.serviceAnnotations,
      },
      /**
       * we'll only add the antiaffinity policy if
       * there are more than 1 replicas
       */
      affinity:
        replicas <= 1
          ? undefined
          : {
              podAntiAffinity: {
                preferredDuringSchedulingIgnoredDuringExecution: [
                  {
                    weight: 1,
                    podAffinityTerm: {
                      topologyKey: 'kubernetes.io/hostname',
                      labelSelector: {
                        matchExpressions: [
                          {
                            key: 'app',
                            operator: 'In',
                            values: ['nginx-ingress'],
                          },
                          {
                            key: 'component',
                            operator: 'In',
                            values: ['controller'],
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
    };
  }

  private l4Services(props: Record<number, L4ServiceBackend>): NginxL4Backends {
    const backends: NginxL4Backends = {};
    for (const [key, value] of Object.entries(props)) {
      backends[Number(key)] = pulumi.interpolate`${value.namespace}/${value.serviceName}:${value.servicePort}`;
    }
    return backends;
  }
}
