# MetalLB

## Inputs

| name         | type                 | description            | required |
| ------------ | -------------------- | ---------------------- | -------- |
| provider     | k8s.Provider         |                        | yes      |
| namespace    | pulumi.Input<string> |                        | yes      |
| version      | string               | the helm chart version | yes      |
| addressPools | AddressPool[]        |                        | yes      |

## Outputs

| name | type                                 | description | required |
| ---- | ------------------------------------ | ----------- | -------- |
| meta | pulumi.Output<abstractions.HelmMeta> |             | no       |