
# Interface: RookCephInputs

## Properties

### `Optional` blockPool

• **blockPool**? : *[CephBlockPool](__kloudlib_rook_ceph_.cephblockpool.md)*

*Defined in [rook-ceph/index.ts:38](https://github.com/Place1/kloudlib/blob/27a9d16/packages/rook-ceph/index.ts#L38)*

___

### `Optional` cluster

• **cluster**? : *[CephCluster](__kloudlib_rook_ceph_.cephcluster.md)*

Enable a Ceph Cluster
Enabled by default.

*Defined in [rook-ceph/index.ts:34](https://github.com/Place1/kloudlib/blob/27a9d16/packages/rook-ceph/index.ts#L34)*

___

### `Optional` namespace

• **namespace**? : *pulumi.Input‹string›*

*Defined in [rook-ceph/index.ts:20](https://github.com/Place1/kloudlib/blob/27a9d16/packages/rook-ceph/index.ts#L20)*

___

### `Optional` provider

• **provider**? : *k8s.Provider*

*Defined in [rook-ceph/index.ts:19](https://github.com/Place1/kloudlib/blob/27a9d16/packages/rook-ceph/index.ts#L19)*

___

### `Optional` storageClass

• **storageClass**? : *[CephStorageClass](__kloudlib_rook_ceph_.cephstorageclass.md)*

Configure a default storage class.
Enabled by default.

*Defined in [rook-ceph/index.ts:43](https://github.com/Place1/kloudlib/blob/27a9d16/packages/rook-ceph/index.ts#L43)*

___

### `Optional` toolbox

• **toolbox**? : *undefined | false | true*

Enable Rook Ceph Toolbox Deployment
Defaults to true.

*Defined in [rook-ceph/index.ts:29](https://github.com/Place1/kloudlib/blob/27a9d16/packages/rook-ceph/index.ts#L29)*

___

### `Optional` version

• **version**? : *undefined | string*

the helm chart version

*Defined in [rook-ceph/index.ts:24](https://github.com/Place1/kloudlib/blob/27a9d16/packages/rook-ceph/index.ts#L24)*
