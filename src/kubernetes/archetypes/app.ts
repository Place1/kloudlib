import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import * as fs from 'fs';
import * as basics from '../services/basics';
import { makename } from '../pulumi';

/**
 * TODO:
 *  - additional ports for things like metrics or health check endpoints
 *  - readyness checks
 *  - termination grace period
 *  - k8s annotations
 */
export interface AppInputs {
  provider: k8s.Provider,
  // the path to a folder containing
  // a Dockerfile or the path to a docker file
  src: string;
  // a fully qualified docker image name without a tag
  // e.g. registry.example.com/group/image-name
  imageName: string;
  // replicas of your service
  // defaults to 1
  replicas?: number;
  // add configuration via environment variables
  // some default environment variables are added
  // for you, consult the library documentation
  env?: Record<string, pulumi.Input<string>>,
  // add secrets to your environment variables
  secrets?: Record<string, pulumi.Input<string>>,
  // the http port your application listens on
  // defaults to 80
  httpPort?: number;
  // configure ingress traffic for this app
  // defaults to undefined (no ingress)
  ingress?: basics.Ingress,
  // resource requests and limits
  // defaults to undefined (no requests or limits)
  resources?: basics.ComputeResources,
}

export interface AppOutputs {
  // the namespace that contains this app
  readonly namespace: pulumi.Output<string>,
  // the ingress host
  readonly ingressHost?: pulumi.Output<string>,
  // the internal kubernetes service name
  readonly serviceName: pulumi.Output<string>,
  // the internal kubernetes deployment name
  readonly deploymentName: pulumi.Output<string>,
  // the docker image that was build for this app
  readonly dockerImage: pulumi.Output<string>,
  // a kubectl command to access this
  // kubernetes service locally for your convinience
  readonly portForwardCommand: pulumi.Output<string>;
}

export class App extends pulumi.CustomResource implements AppOutputs {

  readonly namespace: pulumi.Output<string>;
  readonly ingressHost?: pulumi.Output<string>;
  readonly serviceName: pulumi.Output<string>;
  readonly deploymentName: pulumi.Output<string>;
  readonly dockerImage: pulumi.Output<string>;
  readonly portForwardCommand: pulumi.Output<string>;

  private readonly name: string;
  private readonly props: AppInputs;

  constructor(name: string, props: AppInputs, opts?: pulumi.CustomResourceOptions) {
    super(makename('App'), name, props, opts);
    this.name = name;
    this.props = props;
    this.dockerImage = this.createDockerImage().imageName;
    const deployment = this.createDeployment();
    this.namespace = deployment.metadata.namespace;
    this.deploymentName = deployment.metadata.namespace;
    this.serviceName = this.createService().metadata.name;
    if (this.props.ingress) {
      this.ingressHost = this.createIngress(this.props.ingress).spec.rules[0].host;
    }
    this.portForwardCommand = pulumi.interpolate`kubectl port-forward service/${this.serviceName} 8000:${this.props.httpPort ?? 80}`;
  }

  private createDockerImage(): docker.Image {
    const build = fs.statSync(this.props.src).isDirectory() ? {
      context: this.props.src,
    } : {
      dockerfile: this.props.src,
    };
    return new docker.Image('image', {
      imageName: this.props.imageName,
      build: build,
    });
  }

  private createDeployment(): k8s.apps.v1.Deployment {
    const env = [];

    for (const [name, value] of Object.entries(this.props.src)) {
      env.push({ name, value });
    }

    if (this.props.secrets && Object.keys(this.props.secrets).length > 0) {
      new k8s.core.v1.Secret('secrets', {
        metadata: {
          name: this.name,
          labels: {
            app: this.name,
          },
        },
        stringData: this.props.secrets,
      }, {
        provider: this.props.provider,
      });

      for (const name of Object.keys(this.props.secrets)) {
        env.push({
          name,
          valueFrom: {
            secretKeyRef: {
              name: this.name,
              key: name,
            },
          },
        });
      }
    }

    return new k8s.apps.v1.Deployment('deployment', {
      metadata: {
        name: this.name,
        labels: {
          app: this.name,
        },
      },
      spec: {
        replicas: this.props.replicas,
        selector: {
          matchLabels: {
            app: this.name,
          },
        },
        template: {
          metadata: {
            labels: {
              app: this.name,
            },
          },
          spec: {
            containers: [{
              name: this.name,
              image: this.dockerImage,
              ports: [{
                name: 'http',
                containerPort: this.props.httpPort ?? 80,
              }],
              env: Array.from(Object.entries(this.props.env ?? [])).map(([key, value]) => ({
                name: key,
                value: value,
              })),
              resources: this.props.resources,
            }],
            affinity: {
              podAntiAffinity: {
                preferredDuringSchedulingIgnoredDuringExecution: [{
                  podAffinityTerm: {
                    topologyKey: 'kubernetes.io/hostname',
                    labelSelector: {
                      matchLabels: {
                        app: this.name,
                      },
                    },
                  },
                  weight: 1,
                }],
              },
            },
          },
        },
      },
    }, {
      provider: this.props.provider,
    });
  }

  private createService(): k8s.core.v1.Service {
    return new k8s.core.v1.Service('service', {
      metadata: {
        name: this.name,
        labels: {
          app: this.name,
        },
      },
      spec: {
        type: 'ClusterIP',
        selector: {
          app: this.name,
        },
        ports: [{
          name: 'http',
          port: 80,
          targetPort: this.props.httpPort ?? 80,
        }],
      },
    }, {
      provider: this.props.provider
    });
  }

  private createIngress(inputs: basics.Ingress): k8s.networking.v1beta1.Ingress {
    return new k8s.networking.v1beta1.Ingress('ingress', {
      metadata: {
        name: this.name,
        labels: {
          app: this.name,
        },
        annotations: {
          'kubernetes.io/ingress.class': inputs.class ?? 'nginx',
          'kubernetes.io/tls-acme': 'true',
        },
      },
      spec: {
        rules: [{
          host: inputs.host,
          http: {
            paths: [{
              path: '/',
              backend: {
                serviceName: this.serviceName,
                servicePort: this.props.httpPort ?? 80,
              },
            }],
          },
        }],
        tls: [{
          hosts: [inputs.host],
          secretName: `tls-${this.name}`,
        }],
      }
    }, {
      provider: this.props.provider,
    });
  }

}
