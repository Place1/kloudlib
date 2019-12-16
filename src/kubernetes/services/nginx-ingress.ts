import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes'
import { makename } from '../pulumi';

export interface NginxIngressInputs {
  provider: k8s.Provider;
  mode?: {
    deployment: boolean;
    // how many nginx ingress controller
    // replicas should be deployed.
    // defaults to 2
    replicas?: number;
  } | {
    daemonset: boolean;
    // configure DaemonSet pods to
    // listen on hostPorts (80, 443)
    // or use a Service instead.
    // defaults to 'hostport'
    expose?: 'hostport' | 'service';
  },
  // configure any L4 TCP services
  tcpServices?: L4ServiceBackend[],
  // configure any L4 UDP services
  udpServices?: L4ServiceBackend[],
}

type L4ServiceBackend = Record<PortNumber, {
  namespace: string,
  serviceName: string,
  servicePort: PortNumber,
}>;

type PortNumber = number;

export interface NginxIngressOutputs {
  // the 'kubernetes.io/ingress.class' annotation that this
  // ingress controller will consume
  ingressClass: pulumi.Output<string>;
}

export class NginxIngress extends pulumi.CustomResource implements NginxIngressOutputs {
  readonly ingressClass: pulumi.Output<string>;

  constructor(name: string, props: NginxIngressInputs, opts?: pulumi.CustomResourceOptions) {
    super(makename('NginxIngress'), name, props, opts);

    this.ingressClass = pulumi.output('nginx');

    // TODO: actually make the thing
  }
}
