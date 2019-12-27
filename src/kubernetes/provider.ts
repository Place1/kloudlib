import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as fs from 'fs';

export interface ProviderArgs extends k8s.ProviderArgs {
  fromEnv?: string;
  fromFile?: string;
}

export class Provider extends k8s.Provider {

  constructor(name: string, props: ProviderArgs) {
    super(name, {
      kubeconfig: Provider.kubeconfig(props),
      ...props,
    });
  }

  private static kubeconfig(props: ProviderArgs): pulumi.Input<string> | undefined {
    if (props.fromEnv) {
      return Provider.kubeconfigFromEnv(props.fromEnv);
    }

    if (props.fromFile) {
      return Provider.kubeconfigFromFile(props.fromFile);
    }
  }

  private static kubeconfigFromEnv(envVar: string) {
    const path = process.env[envVar];
    if (!path) {
      throw new Error(`environment variable ${envVar} is not defined`);
    }
    return Provider.kubeconfigFromFile(path);
  }

  private static kubeconfigFromFile(path: string) {
    if (!fs.existsSync(path)) {
      throw new Error(`kubeconfig was not found at path: ${path}`);
    }
    return fs.readFileSync(path, 'utf-8').toString();
  }

}

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

