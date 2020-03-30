
# Interface: SimpleHealthProbe

## Properties

###  path

• **path**: *string*

url is the HTTP url that will be used by
kubernetes to check the readiness of the container.
a 2xx status code indicates the container is ready
to receive traffic

*Defined in [abstractions/index.ts:77](https://github.com/Place1/kloudlib/blob/27a9d16/packages/abstractions/index.ts#L77)*

___

### `Optional` port

• **port**? : *undefined | number*

port configures the HTTP port that the health check
will connect to

*Defined in [abstractions/index.ts:82](https://github.com/Place1/kloudlib/blob/27a9d16/packages/abstractions/index.ts#L82)*
