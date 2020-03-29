# Loki

## Inputs

| name           | type                     | description                                                      | required |
| -------------- | ------------------------ | ---------------------------------------------------------------- | -------- |
| provider       | k8s.Provider             |                                                                  | yes      |
| namespace      | pulumi.Input<string>     |                                                                  | yes      |
| version        | string                   | the helm chart version                                           | yes      |
| retentionHours | number                   | the retention time for recorded logs in hours defaults to 7 days | yes      |
| persistence    | abstractions.Persistence | Data persistence for loki's log database                         | yes      |

## Outputs

| name        | type                                                | description | required |
| ----------- | --------------------------------------------------- | ----------- | -------- |
| meta        | pulumi.Output<abstractions.HelmMeta>                |             | no       |
| clusterUrl  | pulumi.Output<string>                               |             | no       |
| persistence | pulumi.Output<abstractions.Persistence | undefined> |             | no       |