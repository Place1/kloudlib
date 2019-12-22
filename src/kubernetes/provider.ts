import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as fs from 'fs';

// KUBECONFIG will return a k8s.Provider from
// the KUBECONFIG environment variable
export function KUBECONFIG(name?: string): k8s.Provider {
  const kubeconfigPath = process.env.KUBECONFIG;
  if (!kubeconfigPath) {
    new pulumi.RunError(`The KUBECONFIG environment variable is not set`);
    return new k8s.Provider(name ?? 'provider', {}); // dummy provider (the RunError will tell pulumi not to actually execute)
  } else {
    return new k8s.Provider(name ?? 'provider', {
      kubeconfig: fs.readFileSync(kubeconfigPath, 'utf-8').toString()
    });
  }
}
