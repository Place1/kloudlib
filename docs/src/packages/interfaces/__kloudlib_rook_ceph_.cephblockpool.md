
# Interface: CephBlockPool

## Properties

### `Optional` enabled

• **enabled**? : *undefined | false | true*

Enable the block pool.
Defaults to true.

*Defined in [rook-ceph/index.ts:135](https://github.com/Place1/kloudlib/blob/27a9d16/packages/rook-ceph/index.ts#L135)*

___

### `Optional` failureDomain

• **failureDomain**? : *undefined | string*

Set the pool's Failure Domain.
Defaults to 'host'.

*Defined in [rook-ceph/index.ts:145](https://github.com/Place1/kloudlib/blob/27a9d16/packages/rook-ceph/index.ts#L145)*

___

### `Optional` name

• **name**? : *undefined | string*

Set the pool name.
Defaults to '${resource-name}-replicapool'

*Defined in [rook-ceph/index.ts:140](https://github.com/Place1/kloudlib/blob/27a9d16/packages/rook-ceph/index.ts#L140)*

___

### `Optional` replicas

• **replicas**? : *undefined | number*

Set the data replication size.
Defaults to 1.

*Defined in [rook-ceph/index.ts:150](https://github.com/Place1/kloudlib/blob/27a9d16/packages/rook-ceph/index.ts#L150)*
