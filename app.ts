import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";
import * as k8s from "@pulumi/kubernetes";
import { Cluster } from "./cluster";
import { DatabaseServer } from "./database";

export interface AppOptions {
  src: string;
  namespace?: string;
  cluster: Cluster;
  replicas?: number;
  database?: DatabaseServer;
  port?: number;
  domain?: string;
}

export class App extends pulumi.ComponentResource {
  constructor(private name: string, private options: AppOptions) {
    super('app', name);

    const provider = { provider: options.cluster.getKubernetesProvider() };

    const namespace = new k8s.core.v1.Namespace(options.namespace || 'default', {
      metadata: {
        name: options.namespace || 'default',
      }
    }, provider);

    const metadata = {
      namespace: namespace.metadata.apply(value => value.name),
      name: name,
      labels: {
        name: name,
      },
    };

    const image = new docker.Image(`${name}-image`, {
      imageName: name,
      localImageName: name,
      build: options.src,
    });

    const envFrom = []

    if (options.database) {
      envFrom.push({
        secretRef: {
          name: this.createDatabaseSecret(options.database, namespace),
          optional: false,
        }
      });
    }

    const deployment = new k8s.apps.v1.Deployment(`${name}-deployment`, {
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
                image: image.imageName,
                envFrom: envFrom,
                ports: options.port ? [{ containerPort: options.port }] : []
              }
            ],
          }
        }
      }
    }, provider);

    const service = new k8s.core.v1.Service(`${name}-service`, {
      metadata: metadata,
      spec: {
        type: 'CluserIP',
        selector: {
          name: name,
        },
        ports: options.port ? [{
          port: options.port,
          targetPort: options.port,
        }] : [],
      },
    });

    if (options.domain && options.port) {
      const ingress = new k8s.extensions.v1beta1.Ingress(`${name}-ingress`, {
        metadata: metadata,
        spec: {
          rules: [
            {
              host: options.domain,
              http: {
                paths: [
                  {
                    backend: {
                      serviceName: service.metadata.apply(value => value.name),
                      servicePort: options.port,
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

  private createDatabaseSecret(server: DatabaseServer, namespace: k8s.core.v1.Namespace) {
    const database = server.createDatabase(this.name);
    const user = server.createUser(this.name);
    const secretName = `${this.name}-${server}-credentials`;

    const secret = new k8s.core.v1.Secret(secretName, {
      metadata: {
        namespace: namespace.metadata.apply(value => value.name),
        name: secretName,
      },
      stringData: {
        DB_NAME: database.apply(value => value.dbname),
        DB_USERNAME: user.apply(value => value.username),
        DB_PASSWORD: user.apply(value => value.password),
        DB_HOST: database.apply(value => value.host),
        DB_PORT: '5432',
      },
    });

    return secret.metadata.apply(value => value.name);
  }
}
