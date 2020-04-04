/**
 * PostgreSQL is based off [bitnami/postgresql](https://github.com/bitnami/charts/tree/master/bitnami/postgresql)
 *
 * @module "@kloudlib/prometheus"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { PostgreSQL } from '@kloudlib/postgresql';
 *
 * const pg = new PostgreSQL('postgresql', {
 *   // ...
 * });
 *
 * pg.username
 * pg.password
 * pg.database
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as random from '@pulumi/random';
import * as abstractions from '@kloudlib/abstractions';

export interface PostgreSQLInputs {
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
   * helm chart version
   */
  version?: string;
  /**
   * PostgreSQL admin user
   * defaults to postgres
   */
  username?: pulumi.Input<string>;
  /**
   * PostgreSQL admin user's password
   * defaults to a pulumi.RandomPassword
   */
  password?: pulumi.Input<string>;
  /**
   * PostgreSQL database name
   * defaults to db
   */
  database?: pulumi.Input<string>;
  /**
   * postgresql read replica configuration
   */
  replication?: PostgresqlReplication;
  /**
   * configure metrics
   */
  metrics?: PostgresqlMetrics;
  /**
   * configure persistence
   */
  persistence?: abstractions.Persistence;
  /**
   * configure resources
   */
  resources?: abstractions.ComputeResources;
}

export interface PostgresqlReplication {
  /**
   * enable postgresql read replicas
   * defaults of false
   */
  enabled?: pulumi.Input<boolean>;
  /**
   * the number of read replicas
   * defaults to 1
   */
  replicas?: pulumi.Input<number>;
  /**
   * setst the postgresql synchronous commit mode.
   * defaults to off
   */
  synchronousCommit?: pulumi.Input<'on' | 'remote_apply' | 'remote_write' | 'local' | 'off'>;
  /**
   * the number of of replicas that will have
   * synchronous replication.
   * defaults to 0
   */
  numSynchronousReplicas?: pulumi.Input<number>;
  /**
   * the postgresql password for the replication user.
   * defaults to a pulumi.RandomPassword
   */
  replicationPassword?: pulumi.Input<string>;
}

export interface PostgresqlMetrics {
  /**
   * enable a prometheus metrics exporter
   * defaults to false
   */
  enabled?: pulumi.Input<boolean>;
}

export interface PostgreSQLOutputs {
  meta: pulumi.Output<abstractions.HelmMeta>;
  username: pulumi.Output<string>;
  password: pulumi.Output<string>;
  database: pulumi.Output<string>;
  replicationPassword?: pulumi.Output<string>;
}

/**
 * @noInheritDoc
 */
export class PostgreSQL extends pulumi.ComponentResource implements PostgreSQLOutputs {
  readonly meta: pulumi.Output<abstractions.HelmMeta>;
  readonly username: pulumi.Output<string>;
  readonly password: pulumi.Output<string>;
  readonly database: pulumi.Output<string>;
  readonly replicationPassword?: pulumi.Output<string>;

  constructor(name: string, props?: PostgreSQLInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:PostgreSQL', name, props, opts);

    this.username = pulumi.output(props?.username ?? 'postgresql');
    this.password = pulumi.output(
      props?.password ??
        new random.RandomPassword('postgresql-password', {
          length: 32,
        }, { parent: this }).result
    );
    this.database = pulumi.output(props?.database ?? 'db');

    if (props?.replication?.enabled) {
      this.replicationPassword = pulumi.output(
        props.replication.replicationPassword ||
          new random.RandomPassword('postgresql-replication-password', {
            length: 32,
          }, { parent: this }).result
      );
    }

    this.meta = pulumi.output<abstractions.HelmMeta>({
      chart: 'postgresql',
      version: props?.version ?? '8.6.13',
      repo: 'https://charts.bitnami.com/bitnami',
    });

    new k8s.helm.v2.Chart(
      'postgresql',
      {
        chart: this.meta.chart,
        version: this.meta.version,
        fetchOpts: {
          repo: this.meta.repo,
        },
        values: {
          postgresqlUsername: this.username,
          postgresqlPassword: this.password,
          postgresqlDatabase: this.database,
          replication: {
            enabled: props?.replication?.enabled ?? false,
            user: 'repl_user',
            password: this.replicationPassword,
            slaveReplicas: props?.replication?.replicas,
            synchronousCommit: props?.replication?.synchronousCommit,
            numSynchronousReplicas: props?.replication?.numSynchronousReplicas,
          },
          metrics: {
            enabled: props?.metrics?.enabled,
          },
          persistence: {
            enabled: props?.persistence?.enabled,
            size: props?.persistence && pulumi.interpolate`${props?.persistence.sizeGB}Gi`,
            storageClass: props?.persistence?.storageClass,
          },
          resources: props?.resources,
        },
      },
      {
        parent: this,
        providers: props?.provider
          ? {
              kubernetes: props?.provider,
            }
          : {},
      }
    );
  }
}
