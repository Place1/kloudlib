import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";
import * as k8s from "@pulumi/kubernetes";
import { DockerImageResource } from "./docker-image";
import { IDatabaseServer } from "./idatabase";
import { ICluster } from "./icluster";

export interface AppOptions {
  src: string;
  namespace?: k8s.core.v1.Namespace;
  cluster: ICluster;
  replicas?: number;
  buildArgs?: {
    [key: string]: string;
  };
  env?: {
    [key: string]: pulumi.Input<string>;
  },
  ports: Array<{
    containerPort: number;
    servicePort: number;
  }>;
  domain?: string;
}

export class KubernetesApp extends pulumi.ComponentResource {

  public readonly image: DockerImageResource;
  public readonly deployment: k8s.apps.v1.Deployment;
  public readonly service?: k8s.core.v1.Service;
  public readonly ingress?: k8s.extensions.v1beta1.Ingress;

  constructor(private name: string, private options: AppOptions) {
    super('app', name);

    const provider = {
      provider: options.cluster.getKubernetesProvider(),
      parent: this,
    };

    const namespace = options.namespace || k8s.core.v1.Namespace.get(`${name}-namespace`, 'default', { parent: this });

    const metadata = {
      namespace: namespace.metadata.name,
      name: name,
      labels: {
        name: name,
      },
    };

    this.image = new DockerImageResource(`${name}-image`, {
      imageName: `${name}:${Date.now()}`,
      build: options.src,
      push: !options.cluster.isDev(),
      dockerEnv: options.cluster.isDev() ? options.cluster.getDockerEnv() : undefined,
    }, { parent: this });

    this.deployment = new k8s.apps.v1.Deployment(`${name}-deployment`, {
      metadata: metadata,
      spec: {
        selector: {
          matchLabels: {
            name: name
          }
        },
        replicas: options.replicas || 1,
        template: {
          metadata: {
            labels: {
              name: name
            }
          },
          spec: {
            containers: [
              {
                name: name,
                image: this.image.imageName,
                imagePullPolicy: 'IfNotPresent',
                env: Object.entries(options.env || {}).map(([key, value]) => ({
                  name: key,
                  value: value,
                })),
                ports: options.ports.map((port) => ({ containerPort: port.containerPort })),
              }
            ],
          }
        }
      }
    }, provider);

    if (options.ports.length > 0) {
      this.service = new k8s.core.v1.Service(`${name}-service`, {
        metadata: metadata,
        spec: {
          type: 'ClusterIP',
          selector: {
            name: name,
          },
          ports: options.ports.map((port) => ({
            port: port.servicePort,
            targetPort: port.containerPort,
          })),
        },
      }, provider);

      if (options.domain) {
        this.ingress = new k8s.extensions.v1beta1.Ingress(`${name}-ingress`, {
          metadata: metadata,
          spec: {
            rules: [
              {
                host: options.domain,
                http: {
                  paths: [
                    {
                      backend: {
                        serviceName: this.service.metadata.name,
                        servicePort: options.ports[0].servicePort,
                      },
                    }
                  ]
                }
              }
            ]
          }
        }, provider);
      }
    }
  }
}
