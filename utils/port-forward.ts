import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { exec } from 'child_process';
import { betterExec } from './exec';

export interface KillHandler {
  (): void;
}

export function portForward(service: pulumi.Input<k8s.core.v1.Service>): pulumi.Output<KillHandler> {
  if (pulumi.runtime.isDryRun()) {
    return pulumi.output(() => {});
  }
  console.log('forwarding app');
  return pulumi
    .all([ service ])
    .apply(([ service ]) =>
      pulumi
        .all([ service.metadata, service.spec ])
        .apply(([ metadata, spec ]) => {
          const handlers = spec.ports.map((port) => {
            return spawnPortForward(metadata.name, port.targetPort, port.port);
          });
          return () => {
            handlers.forEach((handler) => handler.kill());
          }
        }
      )
    );
}

export function spawnPortForward(serviceName: string, localPort: number | string, targetPort: number | string) {
  return betterExec()
    .pipeDefault()
    .start(`kubectl port-forward service/${serviceName} ${localPort}:${targetPort}`);
}
