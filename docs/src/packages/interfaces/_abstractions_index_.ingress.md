
# Interface: Ingress

## Properties

### `Optional` annotations

• **annotations**? : *pulumi.Input‹Record‹string, pulumi.Input‹string›››*

Any additional annotations for the ingress resource.

*Defined in [abstractions/index.ts:32](https://github.com/Place1/kloudlib/blob/27a9d16/packages/abstractions/index.ts#L32)*

___

### `Optional` class

• **class**? : *pulumi.Input‹string›*

The ingress class for this ingress.
Defaults to 'nginx'.

*Defined in [abstractions/index.ts:28](https://github.com/Place1/kloudlib/blob/27a9d16/packages/abstractions/index.ts#L28)*

___

### `Optional` enabled

• **enabled**? : *pulumi.Input‹boolean›*

If ingress should be enabled or not.
Defaults to true if "host" is set.

*Defined in [abstractions/index.ts:14](https://github.com/Place1/kloudlib/blob/27a9d16/packages/abstractions/index.ts#L14)*

___

### `Optional` hosts

• **hosts**? : *pulumi.Input‹string[]›*

The ingress host i.e. www.example.com.

*Defined in [abstractions/index.ts:18](https://github.com/Place1/kloudlib/blob/27a9d16/packages/abstractions/index.ts#L18)*

___

### `Optional` tls

• **tls**? : *pulumi.Input‹boolean›*

Enable acme tls ('kubernetes.io/tls-acme') for this ingress.
Defaults to true.

*Defined in [abstractions/index.ts:23](https://github.com/Place1/kloudlib/blob/27a9d16/packages/abstractions/index.ts#L23)*
