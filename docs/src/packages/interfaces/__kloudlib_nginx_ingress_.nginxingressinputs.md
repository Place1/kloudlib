
# Interface: NginxIngressInputs

## Properties

### `Optional` mode

• **mode**? : *[NginxIngressDeploymentMode](__kloudlib_nginx_ingress_.nginxingressdeploymentmode.md) | [NginxIngressDaemonSetMode](__kloudlib_nginx_ingress_.nginxingressdaemonsetmode.md)*

mode configures nginx as either a kubernetes
deployment or daemonset.
In Deployment mode a kubernetes Deployment will be
created behind a kubernetes Service of type LoadBalancer.
The Deployment mode is intended to be used in Cloud Environments.
In DaemonSet mode a kubernetes DaemonSet will be created
without a kubernetes Service, instead, hostPorts will be
used by the DaemonSet containers. The DaemonSet mode is intended
to be used in onpremise environments where a LoadBalancer services
may not available.
defaults to Deployment mode.

*Defined in [nginx-ingress/index.ts:39](https://github.com/Place1/kloudlib/blob/27a9d16/packages/nginx-ingress/index.ts#L39)*

___

### `Optional` namespace

• **namespace**? : *pulumi.Input‹string›*

*Defined in [nginx-ingress/index.ts:21](https://github.com/Place1/kloudlib/blob/27a9d16/packages/nginx-ingress/index.ts#L21)*

___

### `Optional` provider

• **provider**? : *k8s.Provider*

*Defined in [nginx-ingress/index.ts:20](https://github.com/Place1/kloudlib/blob/27a9d16/packages/nginx-ingress/index.ts#L20)*

___

### `Optional` tcpServices

• **tcpServices**? : *Record‹number, [L4ServiceBackend](__kloudlib_nginx_ingress_.l4servicebackend.md)›*

configure any L4 TCP services

*Defined in [nginx-ingress/index.ts:43](https://github.com/Place1/kloudlib/blob/27a9d16/packages/nginx-ingress/index.ts#L43)*

___

### `Optional` udpServices

• **udpServices**? : *Record‹number, [L4ServiceBackend](__kloudlib_nginx_ingress_.l4servicebackend.md)›*

configure any L4 UDP services

*Defined in [nginx-ingress/index.ts:47](https://github.com/Place1/kloudlib/blob/27a9d16/packages/nginx-ingress/index.ts#L47)*

___

### `Optional` version

• **version**? : *undefined | string*

the helm chart version

*Defined in [nginx-ingress/index.ts:25](https://github.com/Place1/kloudlib/blob/27a9d16/packages/nginx-ingress/index.ts#L25)*
