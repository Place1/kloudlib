
# Interface: AppInputs

## Properties

### `Optional` env

• **env**? : *Record‹string, pulumi.Input‹string››*

add configuration via environment variables
some default environment variables are added
for you, consult the library documentation

*Defined in [archetypes/app.ts:30](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L30)*

___

### `Optional` healthCheck

• **healthCheck**? : *abstractions.SimpleHealthProbe*

healthCheck configured a k8s readiness probe
if a URL is configured but no port is given then
the app's httpPort or 80 will be used
defaults to undefined (no health check)

*Defined in [archetypes/app.ts:56](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L56)*

___

### `Optional` httpPort

• **httpPort**? : *undefined | number*

the http port your application listens on
defaults to 80

*Defined in [archetypes/app.ts:39](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L39)*

___

###  imageName

• **imageName**: *string*

a fully qualified docker image name without a tag
e.g. registry.example.com/group/image-name

*Defined in [archetypes/app.ts:19](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L19)*

___

### `Optional` imagePullSecret

• **imagePullSecret**? : *pulumi.Input‹string›*

imagePullSecret sets the kubernetes image pull secret
required to pull the app's container image
defaults to undefined

*Defined in [archetypes/app.ts:62](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L62)*

___

### `Optional` ingress

• **ingress**? : *abstractions.Ingress*

configure ingress traffic for this app
defaults to undefined (no ingress)

*Defined in [archetypes/app.ts:44](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L44)*

___

### `Optional` namespace

• **namespace**? : *pulumi.Input‹string›*

*Defined in [archetypes/app.ts:9](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L9)*

___

### `Optional` provider

• **provider**? : *k8s.Provider*

*Defined in [archetypes/app.ts:8](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L8)*

___

### `Optional` replicas

• **replicas**? : *undefined | number*

replicas of your service
defaults to 1

*Defined in [archetypes/app.ts:24](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L24)*

___

### `Optional` resources

• **resources**? : *abstractions.ComputeResources*

resource requests and limits
defaults to undefined (no requests or limits)

*Defined in [archetypes/app.ts:49](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L49)*

___

### `Optional` secrets

• **secrets**? : *Record‹string, pulumi.Input‹string››*

add secrets to your environment variables

*Defined in [archetypes/app.ts:34](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L34)*

___

###  src

• **src**: *string*

the path to a folder containing
a Dockerfile or the path to a docker file

*Defined in [archetypes/app.ts:14](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L14)*
