
# Interface: Persistence

## Properties

### `Optional` enabled

• **enabled**? : *pulumi.Input‹boolean›*

if ingress should be enabled or not
defaults to true

*Defined in [abstractions/index.ts:40](https://github.com/Place1/kloudlib/blob/27a9d16/packages/abstractions/index.ts#L40)*

___

### `Optional` sizeGB

• **sizeGB**? : *undefined | number*

the size of the persistent volume in Gigabytes
non-interger values are supported
note that some cloud providers have a minimum
volume size that is used if your choice is too small

*Defined in [abstractions/index.ts:47](https://github.com/Place1/kloudlib/blob/27a9d16/packages/abstractions/index.ts#L47)*

___

### `Optional` storageClass

• **storageClass**? : *undefined | string*

the storage class for the persistent volume
defaults to undefined (i.e. use the cluster's default storage class)

*Defined in [abstractions/index.ts:52](https://github.com/Place1/kloudlib/blob/27a9d16/packages/abstractions/index.ts#L52)*
