import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import * as fs from 'fs';
import * as abstractions from '@kloudlib/abstractions';

export interface AppInputs {
  provider?: k8s.Provider;
  namespace?: pulumi.Input<string>;
  /**
   * the path to a folder containing
   * a Dockerfile or the path to a docker file
   */
  src?: string | docker.DockerBuild;
  /**
   * a fully qualified docker image name without a tag
   * e.g. registry.example.com/group/image-name
   */
  imageName: pulumi.Input<string>;
  /**
   * replicas of your service
   * defaults to 1
   */
  replicas?: number;
  /**
   * add configuration via environment variables
   * some default environment variables are added
   * for you, consult the library documentation
   */
  env?: Record<string, pulumi.Input<string>>;
  /**
   * add secrets to your environment variables
   */
  secrets?: Record<string, pulumi.Input<string>>;
  /**
   * the http port your application listens on
   * defaults to 80
   */
  httpPort?: number;
  /**
   * configure ingress traffic for this app
   * defaults to undefined (no ingress)
   */
  ingress?: abstractions.Ingress;
  /**
   * resource requests and limits
   * defaults to undefined (no requests or limits)
   */
  resources?: abstractions.ComputeResources;
  /**
   * healthCheck configured a k8s readiness probe
   * if a URL is configured but no port is given then
   * the app's httpPort or 80 will be used
   * defaults to undefined (no health check)
   */
  healthCheck?: abstractions.SimpleHealthProbe;
  /**
   * imagePullSecret sets the kubernetes image pull secret
   * required to pull the app's container image
   * defaults to undefined
   */
  imagePullSecret?: pulumi.Input<string>;
}

export interface AppOutputs {
  /**
   * the namespace that contains this app
   */
  readonly namespace: pulumi.Output<string>;
  /**
   * the ingress host
   */
  readonly ingressHosts?: pulumi.Output<string[]>;
  /**
   * the internal kubernetes service name
   */
  readonly service: k8s.core.v1.Service;
  /**
   * the internal kubernetes deployment name
   */
  readonly deployment: k8s.apps.v1.Deployment;
  /**
   * the docker image that was build for this app
   */
  readonly dockerImage: pulumi.Output<string>;
}

/**
 * @noInheritDoc
 * @example
 * ```typescript
 * import { App } from '@kloudlib/archetypes';
 *
 * new App('app', {
 *   src: path.resolve(__dirname), // path to your Dockerfile
 *   imageName: 'your.docker.registry/project/image',
 *   httpPort: 80, // what port does your app listen on? defaults to 80.
 *   replicas: 2,
 *   ingress: {
 *     hosts: [
 *       'example.com',
 *       'www.example.com',
 *     ],
 *   },
 *   imagePullSecret: imagePullSecret.secret.metadata.name,
 * });
 * ```
 */
export class App extends pulumi.ComponentResource implements AppOutputs {
  readonly namespace: pulumi.Output<string>;
  readonly ingressHosts?: pulumi.Output<string[]>;
  readonly service: k8s.core.v1.Service;
  readonly deployment: k8s.apps.v1.Deployment;
  readonly dockerImage: pulumi.Output<string>;

  constructor(name: string, props: AppInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:App', name, props, opts);

    // docker image
    if (props.src) {
      this.dockerImage = this.createDockerImage(name, props).imageName;
    } else {
      this.dockerImage = pulumi.output(props.imageName);
    }

    // deployment
    this.deployment = this.createDeployment(name, props);
    this.namespace = this.deployment.metadata.namespace;

    // service
    this.service = this.createService(name, props);

    // ingress
    if (props.ingress && props.ingress.enabled !== false) {
      this.ingressHosts = this.createIngress(name, props).spec.rules.apply((rules) => rules.map((r) => r.host));
    }
  }

  private createDockerImage(name: string, props: AppInputs): docker.Image {
    return new docker.Image(
      `${name}-image`,
      {
        imageName: props.imageName,
        build: props.src!,
      },
      {
        parent: this,
      }
    );
  }

  private createDeployment(name: string, props: AppInputs): k8s.apps.v1.Deployment {
    const env = [];

    if (props.env) {
      for (const key of Object.keys(props.env)) {
        env.push({ name: key, value: props.env[key] });
      }
    }

    if (props.secrets && Object.keys(props.secrets).length > 0) {
      const secret = new k8s.core.v1.Secret(
        `${name}-secrets`,
        {
          metadata: {
            name: name,
            namespace: props.namespace,
            labels: {
              app: name,
            },
          },
          stringData: props.secrets,
        },
        {
          parent: this,
          provider: props.provider,
        }
      );

      for (const key of Object.keys(props.secrets)) {
        env.push({
          name: key,
          valueFrom: {
            secretKeyRef: {
              name: secret.metadata.name,
              key: key,
            },
          },
        });
      }
    }

    return new k8s.apps.v1.Deployment(
      `${name}-deployment`,
      {
        metadata: {
          name: name,
          namespace: props.namespace,
          labels: {
            app: name,
          },
        },
        spec: {
          replicas: props.replicas,
          selector: {
            matchLabels: {
              app: name,
            },
          },
          template: {
            metadata: {
              labels: {
                app: name,
              },
            },
            spec: {
              containers: [
                {
                  name: name,
                  image: this.dockerImage,
                  ports: [
                    {
                      name: 'http',
                      containerPort: props.httpPort ?? 80,
                    },
                  ],
                  env: env,
                  resources: props.resources,
                  readinessProbe: !props.healthCheck
                    ? undefined
                    : {
                        httpGet: {
                          path: props.healthCheck.path,
                          port: props.healthCheck.port ?? props.httpPort ?? 80,
                        },
                        periodSeconds: 5,
                        timeoutSeconds: 2,
                        successThreshold: 1,
                        failureThreshold: 3,
                        initialDelaySeconds: 0,
                      },
                  livenessProbe: !props.healthCheck
                    ? undefined
                    : {
                        httpGet: {
                          path: props.healthCheck.path,
                          port: props.healthCheck.port ?? props.httpPort ?? 80,
                        },
                        periodSeconds: 10,
                        timeoutSeconds: 5,
                        successThreshold: 1,
                        failureThreshold: 5,
                        initialDelaySeconds: 60,
                      },
                },
              ],
              affinity: {
                podAntiAffinity: {
                  preferredDuringSchedulingIgnoredDuringExecution: [
                    {
                      podAffinityTerm: {
                        topologyKey: 'kubernetes.io/hostname',
                        labelSelector: {
                          matchLabels: {
                            app: name,
                          },
                        },
                      },
                      weight: 1,
                    },
                  ],
                },
              },
              imagePullSecrets: !props.imagePullSecret
                ? undefined
                : [
                    {
                      name: props.imagePullSecret,
                    },
                  ],
            },
          },
        },
      },
      {
        parent: this,
        provider: props.provider,
        dependsOn: [this.deployment],
      }
    );
  }

  private createService(name: string, props: AppInputs): k8s.core.v1.Service {
    return new k8s.core.v1.Service(
      `${name}-service`,
      {
        metadata: {
          name: name,
          namespace: props.namespace,
          labels: {
            app: name,
          },
        },
        spec: {
          type: 'ClusterIP',
          selector: {
            app: name,
          },
          ports: [
            {
              name: 'http',
              port: 80,
              targetPort: props.httpPort ?? 80,
            },
          ],
        },
      },
      {
        parent: this,
        provider: props.provider,
      }
    );
  }

  private createIngress(name: string, props: AppInputs): k8s.networking.v1beta1.Ingress {
    const hosts = pulumi.output(props.ingress?.hosts ?? []);
    return new k8s.networking.v1beta1.Ingress(
      `${name}-ingress`,
      {
        metadata: {
          name: name,
          namespace: props.namespace,
          labels: {
            app: name,
          },
          annotations: {
            'kubernetes.io/ingress.class': props.ingress?.class ?? 'nginx',
            'kubernetes.io/tls-acme': 'true',
            ...props.ingress?.annotations,
          },
        },
        spec: {
          rules: hosts.apply((items: string[]) =>
            items.map((host) => ({
              host: host,
              http: {
                paths: [
                  {
                    path: '/',
                    backend: {
                      serviceName: this.service.metadata.name,
                      servicePort: props.httpPort ?? 80,
                    },
                  },
                ],
              },
            }))
          ),
          tls: [
            {
              hosts: hosts,
              secretName: `tls-${name}`,
            },
          ],
        },
      },
      {
        parent: this,
        provider: props.provider,
        dependsOn: [this.service],
      }
    );
  }
}
