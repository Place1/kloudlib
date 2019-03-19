import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { IDatabaseServer, IDatabaseUser, IDatabase } from './idatabase';

export interface DatabaseOptions {
  namespace?: k8s.core.v1.Namespace,
  provider: k8s.Provider;
}

export class DevelopmentDatabaseServer extends pulumi.ComponentResource implements IDatabaseServer {

  private deployment: k8s.apps.v1.Deployment;
  private service: k8s.core.v1.Service;

  constructor(private name: string, private options: DatabaseOptions) {
    super('database', name);

    const provider = {
      provider: options.provider,
      parent: this,
    };

    const namespace = options.namespace || k8s.core.v1.Namespace.get(`${name}-namespace`, 'default');

    const metadata = {
      namespace: namespace.metadata.apply((value) => value.name),
      name: name,
      labels: {
        name: name,
      },
    };

    this.deployment = new k8s.apps.v1.Deployment(`${name}-deployment`, {
      metadata: metadata,
      spec: {
        selector: {
          matchLabels: {
            name: name
          }
        },
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
                image: 'postgres:10-alpine',
                imagePullPolicy: 'IfNotPresent',
                ports: [{ containerPort: 5432 }],
                env: [
                  {
                    name: 'POSTGRES_USER',
                    value: 'developer',
                  },
                  {
                    name: 'POSTGRES_PASSWORD',
                    value: 'password',
                  },
                  {
                    name: 'POSTGRES_DB',
                    value: 'db',
                  },
                ]
              }
            ],
          }
        }
      }
    }, provider);

    this.service = new k8s.core.v1.Service(`${name}-service`, {
      metadata: metadata,
      spec: {
        type: 'ClusterIP',
        selector: {
          name: name,
        },
        ports: [{
          port: 5432,
          targetPort: 5432,
        }],
      },
    })
  }

  createUser(username: string): pulumi.Output<IDatabaseUser> {
    return pulumi.output({
      username: 'developer',
      password: 'password',
    });
  }

  createDatabase(dbname: string): pulumi.Output<IDatabase> {
    return pulumi.output({
      host: this.name,
      dbname: 'db',
    });
  }
}
