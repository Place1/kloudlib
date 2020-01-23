import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import * as fs from 'fs';
import * as basics from '../services/basics';

export interface AppInputs {
  provider?: k8s.Provider;
  namespace?: pulumi.Input<string>;
  /**
   * the path to a folder containing
   * a Dockerfile or the path to a docker file
   */
  src: string;
  /**
   * a fully qualified docker image name without a tag
   * e.g. registry.example.com/group/image-name
   */
  imageName: string;
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
  ingress?: basics.Ingress;
  /**
   * resource requests and limits
   * defaults to undefined (no requests or limits)
   */
  resources?: basics.ComputeResources;
  /**
   * healthCheck configured a k8s readiness probe
   * if a URL is configured but no port is given then
   * the app's httpPort or 80 will be used
   * defaults to undefined (no health check)
   */
  healthCheck?: basics.SimpleHealthProbe;
  /**
   * imagePullSecret sets the kubernetes image pull secret
   * required to pull the app's container image
   * defaults to undefined
   */
  imagePullSecret?: k8s.core.v1.Secret;
}

export interface AppOutputs {
  /**
   * the namespace that contains this app
   */
  readonly namespace: pulumi.Output<string>;
  /**
   * the ingress host
   */
  readonly ingressHost?: pulumi.Output<string>;
  /**
   * the internal kubernetes service name
   */
  readonly serviceName: pulumi.Output<string>;
  /**
   * the internal kubernetes deployment name
   */
  readonly deploymentName: pulumi.Output<string>;
  /**
   * the docker image that was build for this app
   */
  readonly dockerImage: pulumi.Output<string>;
  /**
   * a kubectl command to access this
   * kubernetes service locally for your convinience
   */
  readonly portForwardCommand: pulumi.Output<string>;
}

export class App extends pulumi.ComponentResource implements AppOutputs {

  readonly namespace: pulumi.Output<string>;
  readonly ingressHost?: pulumi.Output<string>;
  readonly serviceName: pulumi.Output<string>;
  readonly deploymentName: pulumi.Output<string>;
  readonly dockerImage: pulumi.Output<string>;
  readonly portForwardCommand: pulumi.Output<string>;

  constructor(name: string, props: AppInputs, opts?: pulumi.CustomResourceOptions) {
    super('App', name, props, opts);
    this.dockerImage = this.createDockerImage(props).imageName;
    const deployment = this.createDeployment(name, props);
    this.namespace = deployment.metadata.namespace;
    this.deploymentName = deployment.metadata.namespace;
    this.serviceName = this.createService(name, props).metadata.name;
    if (props.ingress) {
      this.ingressHost = this.createIngress(name, props).spec.rules[0].host;
    }
    this.portForwardCommand = pulumi.interpolate`kubectl port-forward service/${this.serviceName} 8000:${props.httpPort ?? 80}`;
  }

  private createDockerImage(props: AppInputs): docker.Image {
    const build: docker.DockerBuild = fs.statSync(props.src).isDirectory() ? {
      context: props.src,
    } : {
      dockerfile: props.src,
    };
    return new docker.Image('image', {
      imageName: props.imageName,
      build: build,
    }, {
      parent: this,
    });
  }

  private createDeployment(name: string, props: AppInputs): k8s.apps.v1.Deployment {
    const env = [];

    for (const [name, value] of Object.entries(props.src)) {
      env.push({ name, value });
    }

    if (props.secrets && Object.keys(props.secrets).length > 0) {
      new k8s.core.v1.Secret('secrets', {
        metadata: {
          name: name,
          labels: {
            app: name,
          },
        },
        stringData: props.secrets,
      }, {
        parent: this,
        provider: props.provider,
      });

      for (const name of Object.keys(props.secrets)) {
        env.push({
          name,
          valueFrom: {
            secretKeyRef: {
              name: name,
              key: name,
            },
          },
        });
      }
    }

    return new k8s.apps.v1.Deployment('deployment', {
      metadata: {
        name: name,
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
            containers: [{
              name: name,
              image: this.dockerImage,
              ports: [{
                name: 'http',
                containerPort: props.httpPort ?? 80,
              }],
              env: Array.from(Object.entries(props.env ?? [])).map(([key, value]) => ({
                name: key,
                value: value,
              })),
              resources: props.resources,
              readinessProbe: !props.healthCheck ? undefined : {
                httpGet: {
                  path: props.healthCheck.path,
                  port: props.healthCheck.port ?? props.httpPort ?? 80,
                },
                // the below readiness probe values are explicitly set
                // to the kubernetes defaults:
                // https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
                periodSeconds: 10,
                timeoutSeconds: 1,
                successThreshold: 1,
                failureThreshold: 3,
                initialDelaySeconds: 0,
              },
            }],
            affinity: {
              podAntiAffinity: {
                preferredDuringSchedulingIgnoredDuringExecution: [{
                  podAffinityTerm: {
                    topologyKey: 'kubernetes.io/hostname',
                    labelSelector: {
                      matchLabels: {
                        app: name,
                      },
                    },
                  },
                  weight: 1,
                }],
              },
            },
            imagePullSecrets: !props.imagePullSecret ? undefined : [{
              name: props.imagePullSecret.metadata.name,
            }],
          },
        },
      },
    }, {
      parent: this,
      provider: props.provider,
    });
  }

  private createService(name: string, props: AppInputs): k8s.core.v1.Service {
    return new k8s.core.v1.Service('service', {
      metadata: {
        name: name,
        labels: {
          app: name,
        },
      },
      spec: {
        type: 'ClusterIP',
        selector: {
          app: name,
        },
        ports: [{
          name: 'http',
          port: 80,
          targetPort: props.httpPort ?? 80,
        }],
      },
    }, {
      parent: this,
      provider: props.provider
    });
  }

  private createIngress(name: string, props: AppInputs): k8s.networking.v1beta1.Ingress {
    return new k8s.networking.v1beta1.Ingress('ingress', {
      metadata: {
        name: name,
        labels: {
          app: name,
        },
        annotations: {
          'kubernetes.io/ingress.class': props.ingress?.class ?? 'nginx',
          'kubernetes.io/tls-acme': 'true',
        },
      },
      spec: {
        rules: [{
          host: props.ingress?.host,
          http: {
            paths: [{
              path: '/',
              backend: {
                serviceName: this.serviceName,
                servicePort: props.httpPort ?? 80,
              },
            }],
          },
        }],
        tls: [{
          hosts: [props.ingress?.host!],
          secretName: `tls-${name}`,
        }],
      }
    }, {
      parent: this,
      provider: props.provider,
    });
  }

}
