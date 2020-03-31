import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';

export interface ImagePullSecretInputs {
  provider?: k8s.Provider;
  namespace?: pulumi.Input<string>;
  server: pulumi.Input<string>;
  username: pulumi.Input<string>;
  password: pulumi.Input<string>;
}

export interface ImagePullSecretOutputs {
  secret: k8s.core.v1.Secret;
}

/**
 * @noInheritDoc
 * @example
 * ```typescript
 * import { ImagePullSecret } from '@kloudlib/archetypes';
 *
 * const ips = new ImagePullSecret('image-pull-secret', {
 *   server: config.require('docker.server'),
 *   username: config.require('docker.username'),
 *   password: config.requireSecret('docker.password'),
 * });
 *
 * // Now you can use the following property in your
 * // kubernetes pod spec:
 * // ips.secret.metadata.name
 * ```
 */
export class ImagePullSecret extends pulumi.ComponentResource implements ImagePullSecretOutputs {
  readonly secret: k8s.core.v1.Secret;

  constructor(name: string, props: ImagePullSecretInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:ImagePullSecret', name, props, opts);

    this.secret = new k8s.core.v1.Secret(
      `${name}-secret`,
      {
        metadata: {
          name: name,
          namespace: props.namespace,
        },
        type: 'kubernetes.io/dockerconfigjson',
        stringData: {
          '.dockerconfigjson': pulumi
            .all([props.server, props.username, props.password])
            .apply(([server, username, password]) => {
              return JSON.stringify({
                auths: {
                  [server]: {
                    username: username,
                    password: password,
                  },
                },
              });
            }),
        },
      },
      {
        provider: props.provider,
      }
    );
  }
}
