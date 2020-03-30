
# Interface: AppOutputs

## Properties

###  deploymentName

• **deploymentName**: *pulumi.Output‹string›*

the internal kubernetes deployment name

*Defined in [archetypes/app.ts:81](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L81)*

___

###  dockerImage

• **dockerImage**: *pulumi.Output‹string›*

the docker image that was build for this app

*Defined in [archetypes/app.ts:85](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L85)*

___

### `Optional` ingressHosts

• **ingressHosts**? : *pulumi.Output‹string[]›*

the ingress host

*Defined in [archetypes/app.ts:73](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L73)*

___

###  namespace

• **namespace**: *pulumi.Output‹string›*

the namespace that contains this app

*Defined in [archetypes/app.ts:69](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L69)*

___

###  portForwardCommand

• **portForwardCommand**: *pulumi.Output‹string›*

a kubectl command to access this
kubernetes service locally for your convinience

*Defined in [archetypes/app.ts:90](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L90)*

___

###  serviceName

• **serviceName**: *pulumi.Output‹string›*

the internal kubernetes service name

*Defined in [archetypes/app.ts:77](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L77)*
