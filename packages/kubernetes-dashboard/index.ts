/**
 * @module "@kloudlib/kubernetes-dashboard"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { KubernetesDashboard } from '@kloudlib/kubernetes-dashboard';
 *
 * new KubernetesDashboard('kubernetes-dashboard', {
 *   // ...
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as abstractions from '@kloudlib/abstractions';

export interface KubernetesDashboardInputs {
  /**
   * The pulumi kubernetes provider
   */
  provider?: k8s.Provider;
  /**
   * A kubernetes namespace. If present, this will override
   * the given provider's namespace.
   */
  namespace?: pulumi.Input<string>;
  /**
   * ingress resource configuration
   * defaults to undefined (no ingress resource will be created)
   */
  ingress?: abstractions.Ingress;
  /**
   * If set, an additional cluster role / role binding will be created with read only
   * permissions to all resources listed inside.
   *
   * defaults to false
   */
  clusterReadOnlyRole?: boolean;
  /**
   * The helm chart version
   */
  version?: string;
  /**
   * Serve application over HTTP without TLS
   *
   * defaults to false
   */
  protocolHttp?: boolean;
  /**
   * When enabled, the skip button on the login page will be shown.
   *
   * defaults to false
   */
  enableSkipLogin?: boolean;
  /**
   * When enabled, Dashboard login view will also be shown when Dashboard is not served over HTTPS.
   *
   * defaults to false
   */
  enableInsecureLogin?: boolean;
  /**
   * Wether to enable metrics-server.
   *
   * Metrics server must be enabled for the dashboard to show
   * workload metrics such as CPU and Memory usage.
   *
   * defaults to false
   */
  metricsService?: {
    enabled?: boolean;
  };
  /**
   * When non-empty displays message to Dashboard users. Accepts simple HTML tags.
   */
  systemBanner?: pulumi.Input<string>;
}

export interface KubernetesDashboardOutputs {
  meta: pulumi.Output<abstractions.HelmMeta>;
}

/**
 * @noInheritDoc
 */
export class KubernetesDashboard extends pulumi.ComponentResource implements KubernetesDashboardOutputs {
  readonly meta: pulumi.Output<abstractions.HelmMeta>;

  constructor(name: string, props?: KubernetesDashboardInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:KubernetesDashboard', name, props, opts);

    this.meta = pulumi.output<abstractions.HelmMeta>({
      chart: 'kubernetes-dashboard',
      version: props?.version ?? '2.7.1',
      repo: 'https://kubernetes.github.io/dashboard',
    });

    const extraArgs = new Array<pulumi.Input<string>>();

    if (props?.enableSkipLogin) {
      extraArgs.push('--enable-skip-login=true');
    }

    if (props?.enableInsecureLogin) {
      extraArgs.push('--enable-insecure-login=true');
    }

    if (props?.systemBanner) {
      extraArgs.push(pulumi.interpolate`--system-banner=${props.systemBanner}`);
    }

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
          extraArgs: extraArgs,
          protocolHttp: props?.protocolHttp ?? false,
          rbac: {
            clusterReadOnlyRole: props?.clusterReadOnlyRole ?? false,
          },
          service: {
            externalPort: props?.protocolHttp ? 80 : 443,
          },
          metricsScraper: {
            enabled: props?.metricsService?.enabled ?? false,
          },
          'metrics-server': {
            enabled: props?.metricsService?.enabled ?? false,
            args: ['--kubelet-insecure-tls', '--kubelet-preferred-address-types=InternalIP'],
          },
          ingress: {
            enabled: props?.ingress?.enabled ?? false,
            annotations: {
              'kubernetes.io/ingress.class': props?.ingress?.class ?? 'nginx',
              'kubernetes.io/tls-acme': String(props?.ingress?.tls ?? false),
              ...props?.ingress?.annotations,
            },
            hosts: props?.ingress?.hosts,
            tls: [
              {
                hosts: props?.ingress?.hosts,
                secretName: `tls-kubernetes-dashboard-${name}`,
              },
            ],
          },
        },
      },
      {
        parent: this,
        providers: props?.provider && {
          kubernetes: props.provider,
        },
      }
    );
  }
}
