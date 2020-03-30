
# Class: ImagePullSecret <**TData**>

**`example`** 
```typescript
import { ImagePullSecret } from '@kloudlib/archetypes';

const ips = new ImagePullSecret('image-pull-secret', {
  server: config.require('docker.server'),
  username: config.require('docker.username'),
  password: config.requireSecret('docker.password'),
});

// Now you can use the following property in your
// kubernetes pod spec:
// ips.secret.metadata.name
```

## Constructors

###  constructor

\+ **new ImagePullSecret**(`name`: string, `props`: [ImagePullSecretInputs](../interfaces/_archetypes_image_pull_secret_.imagepullsecretinputs.md), `opts?`: pulumi.CustomResourceOptions): *[ImagePullSecret](_archetypes_image_pull_secret_.imagepullsecret.md)*

*Defined in [archetypes/image-pull-secret.ts:34](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/image-pull-secret.ts#L34)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |
`props` | [ImagePullSecretInputs](../interfaces/_archetypes_image_pull_secret_.imagepullsecretinputs.md) |
`opts?` | pulumi.CustomResourceOptions |

**Returns:** *[ImagePullSecret](_archetypes_image_pull_secret_.imagepullsecret.md)*

## Properties

###  secret

• **secret**: *Secret*

*Defined in [archetypes/image-pull-secret.ts:34](https://github.com/Place1/kloudlib/blob/27a9d16/packages/archetypes/image-pull-secret.ts#L34)*
