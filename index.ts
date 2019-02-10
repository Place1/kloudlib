import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import * as k8s from '@pulumi/kubernetes';
import * as path from 'path';
import { Cluster } from './cluster';
import { DatabaseServer } from './database';
import { App } from './app';
import { MonitoringStack } from './monitoring/monitoring-stack';

// export const cluster = new Cluster('my-cluster');

export const monitoringStack = new MonitoringStack('monitoring-stack');

// export const database = new DatabaseServer('my-database');

// export const app = new App('my-app', {
//   src: path.join(__dirname, 'app/'),
//   cluster: cluster,
//   database: database,
//   domain: 'www.myapp.com',
// });
