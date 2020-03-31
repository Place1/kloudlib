
# Class: App <**TData**>

**`example`** 
```typescript
import { App } from '@kloudlib/archetypes';

new App('app', {
  src: path.resolve(__dirname), // path to your Dockerfile
  imageName: 'your.docker.registry/project/image',
  httpPort: 80, // what port does your app listen on? defaults to 80.
  replicas: 2,
  ingress: {
    hosts: [
      'example.com',
      'www.example.com',
    ],
  },
  imagePullSecret: imagePullSecret.secret.metadata.name,
});
```

## Constructors

###  constructor

\+ **new App**(`name`: string, `props`: [AppInputs](../interfaces/_archetypes_app_.appinputs.md), `opts?`: pulumi.CustomResourceOptions): *[App](_archetypes_app_.app.md)*

*Defined in [archetypes/app.ts:120](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L120)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |
`props` | [AppInputs](../interfaces/_archetypes_app_.appinputs.md) |
`opts?` | pulumi.CustomResourceOptions |

**Returns:** *[App](_archetypes_app_.app.md)*

## Properties

###  deploymentName

• **deploymentName**: *pulumi.Output‹string›*

*Defined in [archetypes/app.ts:118](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L118)*

___

###  dockerImage

• **dockerImage**: *pulumi.Output‹string›*

*Defined in [archetypes/app.ts:119](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L119)*

___

### `Optional` ingressHosts

• **ingressHosts**? : *pulumi.Output‹string[]›*

*Defined in [archetypes/app.ts:116](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L116)*

___

###  namespace

• **namespace**: *pulumi.Output‹string›*

*Defined in [archetypes/app.ts:115](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L115)*

___

###  portForwardCommand

• **portForwardCommand**: *pulumi.Output‹string›*

*Defined in [archetypes/app.ts:120](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L120)*

___

###  serviceName

• **serviceName**: *pulumi.Output‹string›*

*Defined in [archetypes/app.ts:117](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/app.ts#L117)*
