
# Interface: CephStorageClass

## Properties

### `Optional` allowVolumeExpansion

• **allowVolumeExpansion**? : *undefined | false | true*

Enable volume expansion.
Defaults to true.

*Defined in [rook-ceph/index.ts:178](https://github.com/Place1/kloudlib/blob/27a9d16/packages/rook-ceph/index.ts#L178)*

___

### `Optional` enabled

• **enabled**? : *undefined | false | true*

Enable the storage class.
Defaults to true.

*Defined in [rook-ceph/index.ts:158](https://github.com/Place1/kloudlib/blob/27a9d16/packages/rook-ceph/index.ts#L158)*

___

### `Optional` fstype

• **fstype**? : *"xfs" | "ext4"*

Set the file system type for the storage class.
Defaults to 'xfs'.

*Defined in [rook-ceph/index.ts:173](https://github.com/Place1/kloudlib/blob/27a9d16/packages/rook-ceph/index.ts#L173)*

___

### `Optional` name

• **name**? : *undefined | string*

Set a name for the storage class.
Defaults to '${resource-name}'.

*Defined in [rook-ceph/index.ts:163](https://github.com/Place1/kloudlib/blob/27a9d16/packages/rook-ceph/index.ts#L163)*

___

### `Optional` reclaimPolicy

• **reclaimPolicy**? : *undefined | string*

Sets the storage class reclaim policy.
Defaults to 'Delete'.

*Defined in [rook-ceph/index.ts:168](https://github.com/Place1/kloudlib/blob/27a9d16/packages/rook-ceph/index.ts#L168)*
