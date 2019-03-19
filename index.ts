import * as k8s from '@pulumi/kubernetes';
import * as path from 'path';
import { App } from './archetypes/app';
import { MonitoringStack } from './monitoring/monitoring-stack';
import { Minikube } from './archetypes/minikube';
import { DevelopmentDatabaseServer } from './archetypes/k8s-database';

// export const cluster = new Cluster('my-cluster');

export const provider = Minikube.getProvider();

export const namespace = k8s.core.v1.Namespace.get('monitoring-namespace', 'default');

export const monitoringStack = new MonitoringStack('monitoring-stack', {
  provider,
  namespace,
});

// export const database = new DatabaseServer('my-database');

// export const app = new App('my-app', {
//   src: path.join(__dirname, 'app/'),
//   cluster: cluster,
//   database: database,
//   domain: 'www.myapp.com',
// });

export const app = new App('my-app', {
  provider: provider,
  src: path.join(__dirname, 'app'),
  database: new DevelopmentDatabaseServer('database', { provider, namespace }),
  port: 8000,
});
