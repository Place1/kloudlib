/**
 * linkerd is based off [linkerd/linkerd2](https://linkerd.io/2/tasks/install-helm/).
 *
 * @module "@kloudlib/linkerd"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { Linkerd } from '@kloudlib/linkerd';
 *
 * new Linkerd('linkerd', {
 *   // ...
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as tls from '@pulumi/tls';
import * as abstractions from '@kloudlib/abstractions';
import { merge } from 'lodash';

export interface LinkerdInputs {
  /**
   * The pulumi kubernetes provider
   */
  provider?: k8s.Provider;
  /**
   * A kubernetes namespace. If present, this will override
   * the given provider's namespace.
   * Linkerd is traditionally deployed into a namespace
   * called "linkerd".
   * defaults to "linkerd"
   */
  namespace?: pulumi.Input<string>;
  /**
   * Helm chart version
   */
  version?: string;
  /**
   * The identity component of Linkerd requires setting
   * up a trust anchor certificate, and an issuer
   * certificate with its key.
   *
   * issuerCertValidityHours configures how long the root
   * CA certificate will be valid for.
   *
   * defaults to 1 year
   */
  issuerCertValidityHours?: number;
  /**
   * Configures linkerd to run in HA mode.
   * HA mode requires at least 3 cluster nodes.
   * defaults to false
   */
  enableHA?: boolean;
  /**
   * Configures linkerd to use it's CNI plugin
   * instead of injecting a proxy-init container.
   * Using the CNI allows containers to run without
   * NET_ADMIN.
   * defaults to false
   */
  enableCNI?: pulumi.Input<boolean>;
}

export interface LinkerdOutputs {
  meta: pulumi.Output<abstractions.HelmMeta>;
}

/**
 * @noInheritDoc
 */
export class Linkerd extends pulumi.ComponentResource implements LinkerdOutputs {
  readonly meta: pulumi.Output<abstractions.HelmMeta>;

  constructor(name: string, props?: LinkerdInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:Linkerd', name, props, opts);

    this.meta = pulumi.output<abstractions.HelmMeta>({
      chart: 'linkerd2',
      version: props?.version ?? '2.7.0',
      repo: 'https://helm.linkerd.io/stable',
    });

    let cniPlugin: k8s.helm.v2.Chart | undefined;

    if (props?.enableCNI) {
      cniPlugin = new k8s.helm.v2.Chart(
        'linkerd-cni-plugin',
        {
          namespace: props.namespace,
          chart: 'linkerd2-cni',
          version: this.meta.version,
          fetchOpts: {
            repo: this.meta.repo,
          },
          values: {
            namespace: props.namespace,
          },
        },
        {
          parent: this,
          providers: props.provider && {
            kubernetes: props.provider,
          },
        }
      );
    }

    const certificates = this.tls(props);

    let values = {
      global: {
        namespace: props?.namespace,
        installNamespace: props?.namespace === undefined,
        identityTrustAnchorsPEM: certificates.ca.certPem,
      },
      identity: {
        issuer: {
          crtExpiry: certificates.issuer.crt.validityEndTime,
          tls: {
            crtPEM: certificates.issuer.crt.certPem,
            keyPEM: certificates.issuer.key.privateKeyPem,
          },
        },
      },
      proxyInjector: {
        crtPEM: certificates.proxyInjector.crt.certPem,
        keyPEM: certificates.proxyInjector.key.privateKeyPem,
      },
      profileValidator: {
        crtPEM: certificates.profileValidator.crt.certPem,
        keyPEM: certificates.profileValidator.key.privateKeyPem,
      },
      tap: {
        crtPEM: certificates.tap.crt.certPem,
        keyPEM: certificates.tap.key.privateKeyPem,
      },
    };

    if (props?.enableHA) {
      const controllerResources = {
        cpu: {
          limit: '1',
          request: '100m',
        },
        memory: {
          limit: '250Mi',
          request: '50Mi',
        },
      };

      values = merge(values, {
        enablePodAntiAffinity: true,
        global: {
          proxy: {
            resources: {
              cpu: {
                limit: '1',
                request: '100m',
              },
              memory: {
                limit: '250Mi',
                request: '20Mi',
              },
            },
          },
        },
        controllerReplicas: 3,
        controllerResources: controllerResources,
        destinationResources: controllerResources,
        publicAPIResources: controllerResources,
        identityResources: {
          cpu: controllerResources.cpu,
          memory: {
            limit: '250Mi',
            request: '10Mi',
          },
        },
        grafanaResources: {
          cpu: controllerResources.cpu,
          memory: {
            limit: '1024Mi',
            request: '50Mi',
          },
        },
        heartbeatResources: controllerResources,
        prometheusResources: {
          cpu: {
            limit: '4',
            request: '300m',
          },
          memory: {
            limit: '8192Mi',
            request: '300Mi',
          },
        },
        proxyInjectorResources: controllerResources,
        webhookFailurePolicy: 'Fail',
        spValidatorResources: controllerResources,
        tapResources: controllerResources,
        webResources: controllerResources,
      });
    }

    new k8s.helm.v2.Chart(
      'linkerd',
      {
        namespace: props?.namespace,
        chart: this.meta.chart,
        version: this.meta.version,
        fetchOpts: {
          repo: this.meta.repo,
        },
        values: values,
      },
      {
        parent: this,
        providers: props?.provider && {
          kubernetes: props.provider,
        },
        dependsOn: cniPlugin && [cniPlugin],
      }
    );
  }

  /**
   * Linkerd requires TLS certificates to be provided
   * to the helm chart.
   * This method will generate all the root CA and the required
   * TLS certficiates.
   */
  private tls(props?: LinkerdInputs) {
    const issuerCertValidityHours = props?.issuerCertValidityHours ?? 365 * 24;

    const caPK = new tls.PrivateKey(
      'linkerd-ca-pk',
      {
        algorithm: 'ECDSA',
        ecdsaCurve: 'P256',
      },
      {
        parent: this,
      }
    );

    const ca = new tls.SelfSignedCert(
      'linkerd-ca',
      {
        isCaCertificate: true,
        keyAlgorithm: 'ECDSA',
        privateKeyPem: caPK.privateKeyPem,
        validityPeriodHours: issuerCertValidityHours,
        subjects: [{ commonName: 'identity.linkerd.cluster.local' }],
        dnsNames: ['identity.linkerd.cluster.local'],
        allowedUses: ['cert_signing', 'crl_signing'],
      },
      {
        parent: this,
      }
    );

    const ns = props?.namespace ?? 'linkerd';

    return {
      ca: ca,
      issuer: this.cert('linkerd-issuer', ca, caPK, 'identity.linkerd.cluster.local', issuerCertValidityHours),
      proxyInjector: this.cert(
        'linkerd-proxy-injector',
        ca,
        caPK,
        pulumi.interpolate`linkerd-proxy-injector.${ns}.svc`,
        issuerCertValidityHours
      ),
      profileValidator: this.cert(
        'linkerd-sp-validator',
        ca,
        caPK,
        pulumi.interpolate`linkerd-sp-validator.${ns}.svc`,
        issuerCertValidityHours
      ),
      tap: this.cert('linkerd-tap', ca, caPK, pulumi.interpolate`linkerd-tap.${ns}.svc`, issuerCertValidityHours),
    };
  }

  /**
   * Each component of linkerd needs a signed certficate.
   * This method will create a key + signed certficiate
   * for use by a linkerd component.
   */
  private cert(
    pulumiName: string,
    ca: tls.SelfSignedCert,
    caPK: tls.PrivateKey,
    commonName: pulumi.Input<string>,
    validityHours: number
  ) {
    const key = new tls.PrivateKey(
      `${pulumiName}-pk`,
      {
        algorithm: 'ECDSA',
        ecdsaCurve: 'P256',
      },
      {
        parent: this,
      }
    );

    const csr = new tls.CertRequest(
      `${pulumiName}-csr`,
      {
        keyAlgorithm: 'ECDSA',
        privateKeyPem: key.privateKeyPem,
        subjects: [{ commonName: commonName }],
        dnsNames: [commonName],
      },
      {
        parent: this,
      }
    );

    const crt = new tls.LocallySignedCert(
      `${pulumiName}-crt`,
      {
        caKeyAlgorithm: 'ECDSA',
        caCertPem: ca.certPem,
        caPrivateKeyPem: caPK.privateKeyPem,
        certRequestPem: csr.certRequestPem,
        validityPeriodHours: validityHours,
        isCaCertificate: true,
        allowedUses: ['cert_signing', 'key_encipherment', 'digital_signature'],
      },
      {
        parent: this,
      }
    );

    return { crt, key };
  }

  /**
   * returns the 'linkerd.io/inject: enabled' annotation.
   *
   * @example
   * ```typescript
   * const ns = new k8s.core.v1.Namespace('ns', {
   *   metadata: {
   *     name: 'my-namespace',
   *     annotations: {
   *       ...linkerd.injectEnabledAnnotation(),
   *     },
   *   },
   * });
   * ```
   */
  injectEnabledAnnotation() {
    return {
      'linkerd.io/inject': 'enabled',
    };
  }

  /**
   * returns the 'linkerd.io/inject: enabled' annotation.
   *
   * @example
   * ```typescript
   * const ns = new k8s.core.v1.Namespace('ns', {
   *   metadata: {
   *     name: 'my-namespace',
   *     annotations: {
   *       ...linkerd.injectDisabledAnnotation(),
   *     },
   *   },
   * });
   * ```
   */
  injectDisabledAnnotation() {
    return {
      'linkerd.io/inject': 'disabled',
    };
  }
}
