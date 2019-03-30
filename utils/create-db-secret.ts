import { IDatabaseServer } from "../archetypes/idatabase";

export function createDatabaseSecret(name: string, server: IDatabaseServer) {
  const database = server.createDatabase(name);
  const user = server.createUser(name);
  return {
    DB_NAME: database.dbname,
    DB_USERNAME: user.username,
    DB_PASSWORD: user.password,
    DB_HOST: database.host,
    DB_PORT: '5432',
  };
}
