import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as path from 'path';
import { KubernetesApp } from './archetypes/kubernetes-app';
import { MonitoringStack } from './monitoring/monitoring-stack';
import { Minikube } from './archetypes/minikube';
import { KubernetesDatabase } from './archetypes/k8s-database';
import { createDatabaseSecret } from './utils/create-db-secret';
import { portForward } from './utils/port-forward';

export const cluster = new Minikube();

// export const monitoringNamespace = new k8s.core.v1.Namespace('monitoring', {
//   metadata: { name: 'monitoring' },
// }, { provider: cluster.getKubernetesProvider() });

// export const monitoring = new MonitoringStack('monitoring', {
//   provider: cluster.getKubernetesProvider(),
//   namespace: monitoringNamespace,
// });

// export const database = new KubernetesDatabase('database', {
//   cluster: cluster,
// });

export const app = new KubernetesApp('my-app', {
  src: path.join(__dirname, 'app/'),
  cluster: cluster,
  // env: createDatabaseSecret('database', database),
  ports: [
    {
      containerPort: 8000,
      servicePort: 80,
    },
  ],
});
