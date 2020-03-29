# RookCeph

## Inputs

| name         | type                 | description                                            | required |
| ------------ | -------------------- | ------------------------------------------------------ | -------- |
| provider     | k8s.Provider         |                                                        | yes      |
| namespace    | pulumi.Input<string> |                                                        | yes      |
| version      | string               | the helm chart version                                 | yes      |
| toolbox      | boolean              | Enable Rook Ceph Toolbox Deployment Defaults to true.  | yes      |
| cluster      | CephCluster          | Enable a Ceph Cluster Enabled by default.              | yes      |
| blockPool    | CephBlockPool        |                                                        | yes      |
| storageClass | CephStorageClass     | Configure a default storage class. Enabled by default. | yes      |

## Outputs

| name | type | description | required |
| ---- | ---- | ----------- | -------- |