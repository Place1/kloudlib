import * as pulumi from '@pulumi/pulumi';

export interface IDatabaseUser {
  username: string;
  password: string;
}

export interface IDatabase {
  host: string;
  dbname: string;
}

export interface IDatabaseServer  {
  createUser(username: string): pulumi.Output<IDatabaseUser>;
  createDatabase(dbname: string): pulumi.Output<IDatabase>;
}
