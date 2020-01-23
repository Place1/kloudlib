import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as fs from 'fs';

export interface ProviderArgs extends k8s.ProviderArgs {
  /**
   * fromEnv will use the given environment variable
   * to find the kubeconfig configuration.
   * either a path to config file or the file content
   * itself is supported as the value of the environment variable
   */
  readonly fromEnv?: string;
  /**
   * fromFile uses the given filepath to read the kubeconfig
   */
  readonly fromFile?: string;
}

export class Provider extends k8s.Provider {

  constructor(name: string, props: ProviderArgs) {
    super(name, {
      kubeconfig: Provider.kubeconfig(props),
      ...props,
    });
  }

  private static kubeconfig(props: ProviderArgs): pulumi.Input<string> | undefined {
    if (props.kubeconfig) {
      return props.kubeconfig;
    }

    if (props.fromEnv) {
      return Provider.kubeconfigFromEnv(props.fromEnv);
    }

    if (props.fromFile) {
      return Provider.kubeconfigFromFile(props.fromFile);
    }
  }

  private static kubeconfigFromEnv(envVar: string) {
    const value = process.env[envVar];
    if (!value) {
      throw new Error(`environment variable ${envVar} is not defined`);
    }
    if (value.includes('\n')) {
      // if the value includes a newline then it's likely
      // the kubeconfig file content itself, so we'll support this use-case
      return value;
    }
    // else it's likely a filepath and we'll read the config from it
    return Provider.kubeconfigFromFile(value);
  }

  private static kubeconfigFromFile(path: string) {
    if (!fs.existsSync(path)) {
      throw new Error(`kubeconfig was not found at path: ${path}`);
    }
    return fs.readFileSync(path, 'utf-8').toString();
  }

}
