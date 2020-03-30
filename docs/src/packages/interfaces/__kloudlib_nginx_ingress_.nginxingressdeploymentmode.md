
# Interface: NginxIngressDeploymentMode

## Properties

###  kind

• **kind**: *"Deployment"*

*Defined in [nginx-ingress/index.ts:51](https://github.com/Place1/kloudlib/blob/27a9d16/packages/nginx-ingress/index.ts#L51)*

___

### `Optional` loadBalancerIP

• **loadBalancerIP**? : *pulumi.Input‹string›*

loadBalancerIP configures the cloud loadbalancer
IP address on supported clouds.
This IP will need to be provisioned using the
appropriate cloud resource.
If this in left blank then kubernetes will assign
an IP address to the nginx-ingress LoadBalancer Service
for you (if supported by your cloud provider).

*Defined in [nginx-ingress/index.ts:67](https://github.com/Place1/kloudlib/blob/27a9d16/packages/nginx-ingress/index.ts#L67)*

___

### `Optional` replicas

• **replicas**? : *pulumi.Input‹number›*

how many nginx ingress controller
replicas should be deployed.
defaults to 1

*Defined in [nginx-ingress/index.ts:57](https://github.com/Place1/kloudlib/blob/27a9d16/packages/nginx-ingress/index.ts#L57)*
