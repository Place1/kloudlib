import * as pulumi from '@pulumi/pulumi';
import * as gcp from '@pulumi/gcp';
import * as random from '@pulumi/random';

export enum DatabaseTier {
  Dbf1Micro = 'db-f1-micro',
}

export interface DatabaseOptions {
  databaseTier?: DatabaseTier,
}

export class DatabaseServer extends pulumi.ComponentResource {

  private instance: gcp.sql.DatabaseInstance;

  constructor(private name: string, private options: DatabaseOptions = {}) {
    super('database', name);

    this.instance = new gcp.sql.DatabaseInstance(`${name}-database-instance`, {
      databaseVersion: "POSTGRES_9_6",
      settings: {
        tier: options.databaseTier || DatabaseTier.Dbf1Micro,
        ipConfiguration: {
          authorizedNetworks: [{ value: "0.0.0.0/0" }],
        },
      },
    });
  }

  createUser(username: string) {
    const password = new random.RandomString(`${username}-database-password`, {
      length: 32,
    });

    const user = new gcp.sql.User(`${username}-database-user`, {
      instance: this.instance.name,
      name: username,
      password: password.result,
    });

    // return { username, password: password.result };
    return pulumi.all([ user, password ])
      .apply(([ user, password ]) => ({
        username: user.name,
        password: password.result,
      }))
  }

  createDatabase(dbname: string) {
    const database = new gcp.sql.Database(`${dbname}-database`, {
      instance: this.instance.name,
      name: dbname,
    });

    return pulumi.all([ database, this.instance ])
      .apply(([ database, instance ]) => ({
        dbname: database.name,
        host: instance.connectionName,
      }));
  }
}
