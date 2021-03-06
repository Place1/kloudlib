import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import * as abstractions from '@kloudlib/abstractions';

export interface AppInputs {
  provider?: k8s.Provider;
  namespace?: pulumi.Input<string>;
  /**
   * A Pod can have multiple containers running apps within it,
   * but it can also have one or more init containers,
   * which are run before the app containers are started.
   * https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
   */
  initContainers?: pulumi.Input<pulumi.Input<k8s.types.input.core.v1.Container>[]>;
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
   * docker registry credentials
   */
  registry?: pulumi.Input<docker.ImageRegistry>;
  /**
   * an optional command for the container to run
   * if left empty, the docker image's default CMD
   * is used.
   */
  command?: pulumi.Input<pulumi.Input<string>[]>;
  /**
   * an optional set of args for the container's entrypoint.
   */
  args?: pulumi.Input<pulumi.Input<string>[]>;
  /**
   * set the working directory for the container's entrypoint.
   */
  workingDir?: pulumi.Input<string>;
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
   * secretRefs adds environment variables to your
   * pod by referencing an existing secret.
   */
  secretRefs?: Record<string, pulumi.Input<{ name: pulumi.Input<string>; key: pulumi.Input<string> }>>;
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
   * persistence creates a PersistentVolumeClaim
   * and mounts it into your pod.
   * the volume will be mounted at /persistence unless
   * persistence.mounthPath is provided.
   * the volume only supports ReadWriteOnce access mode (currently).
   * if persistence is used then only a single replica
   * can be created.
   */
  persistence?: abstractions.Persistence;
  /**
   * metrics allows you to configure prometheus scraping
   * annotations for pods of this app.
   * defaults to undefined
   */
  metrics?: {
    /**
     * should metrics be scraped from this application
     * this will add prometheus scrape annotations
     */
    scrape: boolean;
    /**
     * the port that should be scraped
     * defaults to httpPort
     */
    port?: number;
    /**
     * the path that should be scraped
     * defaults to /metrics
     */
    path?: string;
  };
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

  private bundleEnvs(name: string, props: AppInputs) {
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

    if (props.secretRefs) {
      for (const key of Object.keys(props.secretRefs)) {
        const secret = pulumi.output(props.secretRefs[key]);
        env.push({
          name: key,
          valueFrom: {
            secretKeyRef: {
              name: secret.name,
              key: secret.key,
            },
          },
        });
      }
    }

    return env;
  }

  private createDockerImage(name: string, props: AppInputs): docker.Image {
    return new docker.Image(
      `${name}-image`,
      {
        imageName: props.imageName,
        build: props.src!,
        registry: props.registry,
      },
      {
        parent: this,
      }
    );
  }

  private createDeployment(name: string, props: AppInputs): k8s.apps.v1.Deployment {
    const volumes = this.createVolumes(name, props);

    if (props.replicas && volumes.volumes.length > 0 && props.replicas > 1) {
      throw new Error(`${name} config error: replicas must be 1 when using persistence`);
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
          replicas: props.replicas ?? 1,
          strategy: {
            type: volumes.volumes.length > 0 ? 'Recreate' : 'RollingUpdate',
          },
          selector: {
            matchLabels: {
              app: name,
            },
          },
          template: {
            metadata: {
              annotations: props.metrics && {
                'prometheus.io/scrape': 'true',
                'prometheus.io/port': String(props.metrics.port ?? props.httpPort ?? 80),
                'prometheus.io/path': props.metrics.path ?? '/metrics',
              },
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
                  command: props.command,
                  args: props.args,
                  workingDir: props.workingDir,
                  env: this.bundleEnvs(name, props),
                  resources: props.resources as any,
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
                  volumeMounts: volumes.volumeMounts,
                },
              ],
              initContainers: props.initContainers,
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
              volumes: volumes.volumes,
            },
          },
        },
      },
      {
        parent: this,
        provider: props.provider,
      }
    );
  }

  private createVolumes(name: string, props: AppInputs) {
    const volumes = new Array<k8s.types.input.core.v1.Volume>();
    const volumeMounts = new Array<k8s.types.input.core.v1.VolumeMount>();

    if (props.persistence?.enabled) {
      if (props.persistence.sizeGB === undefined) {
        throw new Error(`${name} is missing the persistence sizeGB field`);
      }

      const pvc = new k8s.core.v1.PersistentVolumeClaim(
        `${name}-volume`,
        {
          metadata: {
            name: name,
            labels: {
              app: name,
            },
          },
          spec: {
            storageClassName: props.persistence.storageClass,
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: `${props.persistence.sizeGB}Gi`,
              },
            },
          },
        },
        {
          parent: this,
          provider: props.provider,
        }
      );

      volumes.push({
        name: name,
        persistentVolumeClaim: {
          claimName: pvc.metadata.name,
        },
      });

      volumeMounts.push({
        name: name,
        mountPath: props.persistence.mountPath ?? '/persistence',
      });
    }

    return {
      volumes,
      volumeMounts,
    };
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
