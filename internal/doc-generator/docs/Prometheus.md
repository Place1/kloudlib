# Prometheus

## Inputs

| name           | type                          | description                                                         | required |
| -------------- | ----------------------------- | ------------------------------------------------------------------- | -------- |
| provider       | k8s.Provider                  |                                                                     | yes      |
| namespace      | pulumi.Input<string>          |                                                                     | yes      |
| version        | string                        | the helm chart version                                              | yes      |
| retentionHours | number                        | the retention time for recorded metrics in hours defaults to 7 days | yes      |
| persistence    | abstractions.Persistence      |                                                                     | yes      |
| resources      | abstractions.ComputeResources |                                                                     | yes      |

## Outputs

| name        | type                                                | description | required |
| ----------- | --------------------------------------------------- | ----------- | -------- |
| meta        | pulumi.Output<abstractions.HelmMeta>                |             | no       |
| persistence | pulumi.Output<abstractions.Persistence | undefined> |             | no       |